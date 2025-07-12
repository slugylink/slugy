import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// In-memory cache for rate limiting to reduce Redis calls
const rateLimitCache = new Map<string, { count: number; reset: number; ttl: number }>();
const CACHE_TTL = 30; // 30 seconds cache
const CACHE_CLEANUP_INTERVAL = 60000; // 1 minute

// Cleanup cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitCache.entries()) {
    if (now > value.reset) {
      rateLimitCache.delete(key);
    }
  }
}, CACHE_CLEANUP_INTERVAL);

// Normalize IP address to handle IPv4 and IPv6
export function normalizeIp(ip: string): string {
  if (ip.includes(":")) {
    // IPv6
    return ip.split(":").slice(0, 4).join(":");
  }
  return ip;
}

// Fast rate limit check with caching
export async function checkRateLimit(ip: string) {
  const key = `rate-limit:${ip}`;
  const limit = 160; // Increased from 100
  const window = 1 * 60; // 1 minutes in seconds

  // Check cache first
  const cached = rateLimitCache.get(key);
  const now = Date.now();
  
  if (cached && now < cached.reset) {
    const remaining = Math.max(0, limit - cached.count);
    return {
      success: cached.count <= limit,
      limit,
      reset: cached.reset,
      remaining,
    };
  }

  // Fallback to Redis
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }

  const ttl = await redis.ttl(key);
  const reset = now + ttl * 1000;
  const remaining = Math.max(0, limit - current);

  // Update cache
  rateLimitCache.set(key, {
    count: current,
    reset,
    ttl,
  });

  return {
    success: current <= limit,
    limit,
    reset,
    remaining,
  };
}

// Fast rate limit for high-traffic endpoints (no Redis call)
export function checkFastRateLimit(ip: string) {
  const key = `fast-rate-limit:${ip}`;
  const limit = 1000; // Higher limit for fast endpoints
  const window = 1 * 60; // 1 minute

  const cached = rateLimitCache.get(key);
  const now = Date.now();
  
  if (cached && now < cached.reset) {
    const remaining = Math.max(0, limit - cached.count);
    return {
      success: cached.count <= limit,
      limit,
      reset: cached.reset,
      remaining,
    };
  }

  // Simple in-memory counter for fast endpoints
  const current = (cached?.count || 0) + 1;
  const reset = now + window * 1000;
  const remaining = Math.max(0, limit - current);

  rateLimitCache.set(key, {
    count: current,
    reset,
    ttl: window,
  });

  return {
    success: current <= limit,
    limit,
    reset,
    remaining,
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
