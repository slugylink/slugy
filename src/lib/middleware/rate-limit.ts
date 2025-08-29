import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// In-memory cache for rate limiting to reduce Redis calls
const rateLimitCache = new Map<
  string,
  { count: number; reset: number; ttl: number; lastAccess: number }
>();

// Sliding window rate limiter with burst handling
export async function checkRateLimit(ip: string) {
  const key = `rate-limit:${ip}`;
  const limit = 80; // Requests per window
  const window = 60; // 1 minute in seconds
  const burstMultiplier = 2; // Allow 2x burst for 10 seconds
  const burstWindow = 10; // 10 seconds burst window

  const now = Date.now();
  // const windowStart = now - (window * 1000);
  // const burstStart = now - (burstWindow * 1000);

  // Check cache first
  const cached = rateLimitCache.get(key);

  if (cached && now < cached.reset) {
    // Check if we're in burst mode
    const isBurstMode = now - cached.lastAccess < burstWindow * 1000;
    const effectiveLimit = isBurstMode ? limit * burstMultiplier : limit;

    const remaining = Math.max(0, effectiveLimit - cached.count);
    return {
      success: cached.count <= effectiveLimit,
      limit: effectiveLimit,
      reset: cached.reset,
      remaining,
      burstMode: isBurstMode,
    };
  }

  // Fallback to Redis with sliding window
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);
  const reset = now + ttl * 1000;
  const remaining = Math.max(0, limit - current);

  // Update cache with last access time
  rateLimitCache.set(key, {
    count: current,
    reset,
    ttl,
    lastAccess: now,
  });

  // Cleanup old entries to prevent memory leaks
  if (rateLimitCache.size > 1000) {
    cleanupCache();
  }

  return {
    success: current <= limit,
    limit,
    reset,
    remaining,
    burstMode: false,
  };
}

// Fast rate limit for high-traffic endpoints (no Redis call)
export function checkFastRateLimit(ip: string) {
  const key = `fast-rate-limit:${ip}`;
  const limit = 1000; // Higher limit for fast endpoints
  const window = 60; // 1 minute
  const burstMultiplier = 1.5; // Allow 1.5x burst

  const now = Date.now();
  const cached = rateLimitCache.get(key);

  if (cached && now < cached.reset) {
    // Check if we're in burst mode
    const isBurstMode = now - cached.lastAccess < 10000; // 10 second burst
    const effectiveLimit = isBurstMode
      ? Math.floor(limit * burstMultiplier)
      : limit;

    const remaining = Math.max(0, effectiveLimit - cached.count);
    return {
      success: cached.count <= effectiveLimit,
      limit: effectiveLimit,
      reset: cached.reset,
      remaining,
      burstMode: isBurstMode,
    };
  }

  // Simple in-memory counter with burst handling
  const current = (cached?.count || 0) + 1;
  const reset = now + window * 1000;
  const remaining = Math.max(0, limit - current);

  rateLimitCache.set(key, {
    count: current,
    reset,
    ttl: window,
    lastAccess: now,
  });

  // Cleanup if cache gets too large
  if (rateLimitCache.size > 1000) {
    cleanupCache();
  }

  return {
    success: current <= limit,
    limit,
    reset,
    remaining,
    burstMode: false,
  };
}

// Temporary link creation rate limiting
export async function checkTempLinkRateLimit(ip: string) {
  const key = `temp-link-limit:${ip}`;
  const limit = 1; // Only 1 temporary link at a time
  const window = 20 * 60; // 20 minutes in seconds

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);
  const reset = Date.now() + ttl * 1000;
  const remaining = Math.max(0, limit - current);

  return {
    success: current <= limit,
    limit,
    reset,
    remaining,
  };
}

// Normalize IP address to handle IPv4 and IPv6
export function normalizeIp(ip: string): string {
  if (ip.includes(":")) {
    // IPv6 - use first 4 segments for rate limiting
    return ip.split(":").slice(0, 4).join(":");
  }
  return ip;
}

// Efficient cache cleanup
function cleanupCache() {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [key, value] of rateLimitCache.entries()) {
    if (now > value.reset || now - value.lastAccess > maxAge) {
      rateLimitCache.delete(key);
    }
  }
}

// Cleanup cache periodically (less frequent to reduce overhead)
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Only set interval if not in serverless environment
if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  setInterval(cleanupCache, CACHE_CLEANUP_INTERVAL);
}
