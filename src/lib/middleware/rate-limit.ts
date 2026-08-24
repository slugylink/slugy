import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─────────── Constants ───────────

const RATE_LIMITS = {
  STANDARD: { limit: 80, window: 60 },
  FAST: { limit: 300, window: 60 },
  REDIRECT: { limit: 120, window: 60 },
  REDIRECT_MISS: { limit: 30, window: 60 },
  TEMP_LINK: { limit: 1, window: 20 * 60 },
} as const;

// ─────────── Types ───────────

export type RateLimitResult = {
  success: boolean;
  limit: number;
  reset: number;
  remaining: number;
};

// ─────────── Helpers ───────────

export const normalizeIp = (ip: string): string => {
  if (ip.includes(":")) {
    return ip.split(":").slice(0, 4).join(":");
  }
  return ip;
};

const createResult = (
  success: boolean,
  limit: number,
  reset: number,
  count: number,
): RateLimitResult => ({
  success,
  limit,
  reset,
  remaining: Math.max(0, limit - count),
});

/**
 * Atomic INCR + EXPIRE via a single Redis pipeline.
 * Always hits Redis — never skip via a local cache (that was a bypass).
 */
const checkRedisLimit = async (
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> => {
  const now = Date.now();

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec<[number, number]>();

    const current = Number(results[0] ?? 0);
    let ttl = Number(results[1] ?? -1);

    // Key had no TTL (new key or crash between incr/expire previously)
    if (current === 1 || ttl < 0) {
      await redis.expire(key, windowSeconds);
      ttl = windowSeconds;
    }

    const reset = now + Math.max(ttl, 1) * 1000;
    return createResult(current <= limit, limit, reset, current);
  } catch (error) {
    console.error("[Rate Limit] Redis error:", error);
    // Fail open for authenticated API traffic so Redis outages don't take the app down.
    return createResult(true, limit, now + windowSeconds * 1000, 0);
  }
};

// ─────────── Public API ───────────

export const checkRateLimit = async (ip: string): Promise<RateLimitResult> => {
  const { limit, window } = RATE_LIMITS.STANDARD;
  return checkRedisLimit(`rate-limit:${ip}`, limit, window);
};

/** Shared Redis limiter for previously "fast" routes (was in-memory only — useless across instances). */
export const checkFastRateLimit = async (
  ip: string,
): Promise<RateLimitResult> => {
  const { limit, window } = RATE_LIMITS.FAST;
  return checkRedisLimit(`fast-rate-limit:${ip}`, limit, window);
};

/** Per-IP throttle for short-link redirects (cache hits included). */
export const checkRedirectRateLimit = async (
  ip: string,
): Promise<RateLimitResult> => {
  const { limit, window } = RATE_LIMITS.REDIRECT;
  return checkRedisLimit(`redirect-rate-limit:${ip}`, limit, window);
};

/** Stricter per-IP throttle when a slug misses cache / DB (anti scan / DDoS). */
export const checkRedirectMissRateLimit = async (
  ip: string,
): Promise<RateLimitResult> => {
  const { limit, window } = RATE_LIMITS.REDIRECT_MISS;
  return checkRedisLimit(`redirect-miss-rate-limit:${ip}`, limit, window);
};

export const checkTempLinkRateLimit = async (
  ip: string,
): Promise<RateLimitResult> => {
  const { limit, window } = RATE_LIMITS.TEMP_LINK;
  return checkRedisLimit(`temp-link-limit:${ip}`, limit, window);
};
