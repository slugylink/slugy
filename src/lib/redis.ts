import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function setCache(
  key: string,
  value: unknown,
  expirationInSeconds = 3600,
): Promise<void> {
  // 1 hour
  try {
    await redis.set(key, JSON.stringify(value), { ex: expirationInSeconds });
    console.log(`Cache set for key: ${key}`);
  } catch (error) {
    console.error("Error setting cache:", error);
  }
}

export async function getCache(key: string): Promise<unknown | null> {
  try {
    const value = await redis.get(key);
    if (typeof value === "string") {
      console.log(`Cache hit for key: ${key}`);
      return JSON.parse(value);
    }
    console.log(`Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    console.error("Error getting cache:", error);
    return null;
  }
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
    console.log(`Cache invalidated for key: ${key}`);
  } catch (error) {
    console.error("Error invalidating cache:", error);
  }
}
