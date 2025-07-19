import { invalidateCache } from "@/lib/redis";

// Cache configuration
const CACHE_PREFIX = "link:";

/**
 * Invalidate link cache when links are updated, deleted, or created
 * This function works with Redis cache
 */
export async function invalidateLinkCache(slug?: string) {
  try {
    if (slug) {
      // Invalidate specific link cache
      const cacheKey = `${CACHE_PREFIX}${slug}`;
      await invalidateCache(cacheKey);
    }
  } catch (error) {
    console.error("Error invalidating link cache:", error);
  }
}

/**
 * Invalidate multiple link caches (for bulk operations)
 */
export async function invalidateLinkCacheBatch(slugs: string[]) {
  try {
    const cacheKeys = slugs.map(slug => `${CACHE_PREFIX}${slug}`);
    await Promise.all(cacheKeys.map(key => invalidateCache(key)));
  } catch (error) {
    console.error("Error invalidating link cache batch:", error);
  }
}

/**
 * Invalidate all link caches (use sparingly)
 */
export async function invalidateAllLinkCaches() {
  try {
    // This would require a more sophisticated approach with Redis SCAN
    // For now, we'll rely on individual cache invalidation
    console.warn("invalidateAllLinkCaches called - consider using specific invalidation");
  } catch (error) {
    console.error("Error invalidating all link caches:", error);
  }
} 