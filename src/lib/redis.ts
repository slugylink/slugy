import { Redis } from "@upstash/redis";

// Validate environment variables early for secure startup
if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  throw new Error("Missing Redis configuration in environment variables.");
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const CACHE_BASE_TTL = 60 * 60 * 23; // 23 hours, in seconds
export const CACHE_TTL_JITTER = 60 * Math.floor(Math.random() * 10); // [0, 9] minutes jitter

// Lightweight non-cryptographic hash to avoid storing raw secrets in Redis keys
export function hashKey(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    // hash * 33 + charCode
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    // Force to 32-bit int
    hash = hash | 0;
  }
  return Math.abs(hash).toString(36);
}

export async function setTemporarySession(
  key: string,
  value: unknown,
  ttlSeconds = 60 * 15,
): Promise<void> {
  try {
    // Use pipeline for better performance if setting multiple keys
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    // Best-effort cache; ignore errors
    console.warn(`Redis cache set failed for key ${key}:`, err);
  }
}

export async function getTemporarySession<T = unknown>(
  key: string,
): Promise<T | null> {
  try {
    return (await redis.get<T | null>(key)) ?? null;
  } catch (err) {
    console.warn(`Redis cache get failed for key ${key}:`, err);
    return null;
  }
}

// Batch operations for better performance
export async function getMultipleSessions<T = unknown>(
  keys: string[],
): Promise<(T | null)[]> {
  try {
    if (keys.length === 0) return [];
    const results = await redis.mget(keys);
    return results.map(result => result as T | null);
  } catch (err) {
    console.warn(`Redis batch get failed:`, err);
    return keys.map(() => null);
  }
}

// Cache invalidation helper
export async function invalidateSessionPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn(`Redis pattern invalidation failed for ${pattern}:`, err);
  }
}