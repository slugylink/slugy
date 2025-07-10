import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Normalize IP address to handle IPv4 and IPv6
export function normalizeIp(ip: string): string {
  if (ip.includes(":")) {
    // IPv6
    return ip.split(":").slice(0, 4).join(":");
  }
  return ip;
}

// General API rate limiting
export async function checkRateLimit(ip: string) {
  const key = `rate-limit:${ip}`;
  const limit = 160; // Increased from 100
  const window = 1 * 60; // 1 minutes in seconds

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
