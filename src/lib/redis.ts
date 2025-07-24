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

// Set a cache entry
export async function setCache(
  key: string,
  value: unknown,
  expirationInSeconds = 3600,
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), { ex: expirationInSeconds });
  } catch (error) {
    console.error(`[Redis] Error setting cache for key "${key}":`, error);
  }
}

// Get a cache entry and parse it as JSON
export async function getCache<T = unknown>(key: string): Promise<T | null> {
  try {
    const value = await redis.get<string>(key);
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as T;
      } catch (parseError) {
        console.error(
          `[Redis] Error parsing cache for key "${key}":`,
          parseError,
        );
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error(`[Redis] Error getting cache for key "${key}":`, error);
    return null;
  }
}

// Delete a cache entry
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[Redis] Error invalidating cache for key "${key}":`, error);
  }
}
