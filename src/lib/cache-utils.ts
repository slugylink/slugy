import { redis } from "@/lib/redis";

// Invalidate link cache
export async function invalidateLinkCache(slug: string): Promise<void> {
  const cacheKey = `link:${slug}`;
  try {
    await redis.del(cacheKey);
    // console.log(`Cache invalidated for key ⚡: ${cacheKey}`);
  } catch (error) {
    console.error(`Failed to invalidate cache for key ${cacheKey}:`, error);
  }
}

// Invalidate multiple link caches
export async function invalidateLinkCacheBatch(slugs: string[]): Promise<void> {
  await Promise.all(slugs.map(slug => invalidateLinkCache(slug)));
}
