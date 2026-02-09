import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─────────── Constants ───────────

const RATE_LIMITS = {
  STANDARD: { limit: 80, window: 60, burstMultiplier: 2, burstWindow: 10 },
  FAST: { limit: 1000, window: 60, burstMultiplier: 1.5, burstWindow: 10 },
  TEMP_LINK: { limit: 1, window: 20 * 60 },
} as const;

const CACHE_CONFIG = {
  MAX_SIZE: 1000,
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_AGE: 5 * 60 * 1000, // 5 minutes
} as const;

// ─────────── Types ───────────

type CacheEntry = {
  count: number;
  reset: number;
  ttl: number;
  lastAccess: number;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  reset: number;
  remaining: number;
  burstMode?: boolean;
};

// ─────────── Cache ───────────

const rateLimitCache = new Map<string, CacheEntry>();

const cleanupCache = (): void => {
  const now = Date.now();

  for (const [key, value] of rateLimitCache.entries()) {
    if (now > value.reset || now - value.lastAccess > CACHE_CONFIG.MAX_AGE) {
      rateLimitCache.delete(key);
    }
  }
};

const shouldCleanupCache = (): boolean =>
  rateLimitCache.size > CACHE_CONFIG.MAX_SIZE;

// ─────────── Helpers ───────────

export const normalizeIp = (ip: string): string => {
  // IPv6 - use first 4 segments for rate limiting
  if (ip.includes(":")) {
    return ip.split(":").slice(0, 4).join(":");
  }
  return ip;
};

const isBurstMode = (lastAccess: number, burstWindow: number): boolean =>
  Date.now() - lastAccess < burstWindow * 1000;

const calculateEffectiveLimit = (
  baseLimit: number,
  burst: boolean,
  multiplier: number,
): number => (burst ? Math.floor(baseLimit * multiplier) : baseLimit);

const createResult = (
  success: boolean,
  limit: number,
  reset: number,
  count: number,
  burst = false,
): RateLimitResult => ({
  success,
  limit,
  reset,
  remaining: Math.max(0, limit - count),
  burstMode: burst,
});

// ─────────── Cached Rate Limit Check ───────────

const checkCachedLimit = (
  key: string,
  baseLimit: number,
  burstMultiplier: number,
  burstWindow: number,
): RateLimitResult | null => {
  const cached = rateLimitCache.get(key);
  const now = Date.now();

  if (!cached || now >= cached.reset) {
    return null;
  }

  const burst = isBurstMode(cached.lastAccess, burstWindow);
  const effectiveLimit = calculateEffectiveLimit(
    baseLimit,
    burst,
    burstMultiplier,
  );

  return createResult(
    cached.count <= effectiveLimit,
    effectiveLimit,
    cached.reset,
    cached.count,
    burst,
  );
};

// ─────────── Redis Rate Limit ───────────

const checkRedisLimit = async (
  key: string,
  limit: number,
  window: number,
): Promise<RateLimitResult> => {
  const now = Date.now();

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);
  const reset = now + ttl * 1000;

  // Update cache
  rateLimitCache.set(key, {
    count: current,
    reset,
    ttl,
    lastAccess: now,
  });

  if (shouldCleanupCache()) {
    cleanupCache();
  }

  return createResult(current <= limit, limit, reset, current);
};

// ─────────── Public API ───────────

export const checkRateLimit = async (ip: string): Promise<RateLimitResult> => {
  const key = `rate-limit:${ip}`;
  const { limit, window, burstMultiplier, burstWindow } = RATE_LIMITS.STANDARD;

  // Check cache first
  const cached = checkCachedLimit(key, limit, burstMultiplier, burstWindow);
  if (cached) return cached;

  // Fallback to Redis
  return checkRedisLimit(key, limit, window);
};

export const checkFastRateLimit = (ip: string): RateLimitResult => {
  const key = `fast-rate-limit:${ip}`;
  const { limit, window, burstMultiplier, burstWindow } = RATE_LIMITS.FAST;
  const now = Date.now();

  const cached = rateLimitCache.get(key);

  // Check existing cache
  if (cached && now < cached.reset) {
    const burst = isBurstMode(cached.lastAccess, burstWindow);
    const effectiveLimit = calculateEffectiveLimit(
      limit,
      burst,
      burstMultiplier,
    );

    return createResult(
      cached.count <= effectiveLimit,
      effectiveLimit,
      cached.reset,
      cached.count,
      burst,
    );
  }

  // Create new entry
  const current = (cached?.count || 0) + 1;
  const reset = now + window * 1000;

  rateLimitCache.set(key, {
    count: current,
    reset,
    ttl: window,
    lastAccess: now,
  });

  if (shouldCleanupCache()) {
    cleanupCache();
  }

  return createResult(current <= limit, limit, reset, current);
};

export const checkTempLinkRateLimit = async (
  ip: string,
): Promise<RateLimitResult> => {
  const key = `temp-link-limit:${ip}`;
  const { limit, window } = RATE_LIMITS.TEMP_LINK;
  const now = Date.now();

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);
  const reset = now + ttl * 1000;

  return createResult(current <= limit, limit, reset, current);
};

// ─────────── Periodic Cleanup ───────────

if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  setInterval(cleanupCache, CACHE_CONFIG.CLEANUP_INTERVAL);
}
