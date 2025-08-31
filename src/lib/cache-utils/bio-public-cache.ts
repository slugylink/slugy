import { redis } from "@/lib/redis";

const CACHE_PREFIX = "bio:public:";
const CACHE_TTL = 86400; // 24 hours (24 * 60 * 60 seconds)
const STALE_WHILE_REVALIDATE = 172800; // 48 hours (48 * 60 * 60 seconds)

// Cache key generator
function generateCacheKey(username: string): string {
  return `${CACHE_PREFIX}${username.toLowerCase().trim()}`;
}

export interface BioPublicCache {
  username: string;
  name: string | null;
  bio: string | null;
  logo: string | null;
  theme: string | null;
  links: Array<{
    id: string;
    title: string;
    url: string;
    position: number;
    isPublic: boolean;
  }>;
  socials: Array<{
    platform: string;
    url: string;
    isPublic: boolean;
  }>;
  cachedAt: number;
  expiresAt: number;
}

// Set cache for bio gallery (24 hours fresh + 48 hours stale)
export async function setBioPublicCache(
  username: string,
  data: Omit<BioPublicCache, "cachedAt" | "expiresAt">,
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(username);
    const cacheData: BioPublicCache = {
      ...data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL * 1000,
    };

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(cacheData));

    // Set a longer TTL for stale-while-revalidate (48 hours)
    const staleKey = `${cacheKey}:stale`;
    await redis.setex(
      staleKey,
      STALE_WHILE_REVALIDATE,
      JSON.stringify(cacheData),
    );

    console.log(
      `[Cache] Bio public cache set for ${username} (24h fresh + 48h stale)`,
    );
  } catch (error) {
    console.error(
      `[Cache] Failed to set bio public cache for ${username}:`,
      error,
    );
    // Don't throw - cache failures shouldn't break the app
  }
}

// Get cache for bio gallery (24h fresh + 48h stale)
export async function getBioPublicCache(
  username: string,
): Promise<BioPublicCache | null> {
  try {
    const cacheKey = generateCacheKey(username);

    let cachedData = await redis.get(cacheKey);

    if (!cachedData) {
      const staleKey = `${cacheKey}:stale`;
      cachedData = await redis.get(staleKey);

      if (cachedData) {
        console.log(`[Cache] Using stale cache for ${username} (48h)`);
      }
    }

    if (!cachedData) {
      return null;
    }

    const parsedData: BioPublicCache = JSON.parse(cachedData as string);

    // Check if cache is expired
    if (parsedData.expiresAt < Date.now()) {
      if (
        parsedData.expiresAt + (STALE_WHILE_REVALIDATE - CACHE_TTL) * 1000 <
        Date.now()
      ) {
        // Stale cache is also expired, remove it
        await redis.del(cacheKey);
        await redis.del(`${cacheKey}:stale`);
        return null;
      }

      console.log(`[Cache] Using expired cache for ${username} (stale data)`);
    }

    return parsedData;
  } catch (error) {
    console.error(
      `[Cache] Failed to get bio public cache for ${username}:`,
      error,
    );
    return null;
  }
}

// Invalidate cache for bio gallery
export async function invalidateBioPublicCache(
  username: string,
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(username);

    await Promise.all([redis.del(cacheKey), redis.del(`${cacheKey}:stale`)]);

    console.log(`[Cache] Bio public cache invalidated for ${username}`);
  } catch (error) {
    console.error(
      `[Cache] Failed to invalidate bio public cache for ${username}:`,
      error,
    );
  }
}

export async function invalidateMultipleBioPublicCache(
  usernames: string[],
): Promise<void> {
  try {
    for (const username of usernames) {
      await invalidateBioPublicCache(username);
    }
    console.log(
      `[Cache] Bio public cache invalidated for ${usernames.length} users`,
    );
  } catch (error) {
    console.error(
      `[Cache] Failed to invalidate multiple bio public cache:`,
      error,
    );
  }
}

export async function clearAllBioPublicCache(): Promise<void> {
  try {
    const pattern = `${CACHE_PREFIX}*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      for (const key of keys) {
        await redis.del(key);
      }
      console.log(`[Cache] Cleared ${keys.length} bio public cache entries`);
    }
  } catch (error) {
    console.error(`[Cache] Failed to clear all bio public cache:`, error);
  }
}

export async function getBioPublicCacheStats(): Promise<{
  totalKeys: number;
  freshKeys: number;
  staleKeys: number;
}> {
  try {
    const pattern = `${CACHE_PREFIX}*`;
    const keys = await redis.keys(pattern);

    const freshKeys = keys.filter((key) => !key.includes(":stale")).length;
    const staleKeys = keys.filter((key) => key.includes(":stale")).length;

    return {
      totalKeys: keys.length,
      freshKeys,
      staleKeys,
    };
  } catch (error) {
    console.error(`[Cache] Failed to get bio public cache stats:`, error);
    return { totalKeys: 0, freshKeys: 0, staleKeys: 0 };
  }
}

export async function warmUpBioPublicCache(usernames: string[]): Promise<void> {
  try {
    console.log(`[Cache] Warming up 24h cache for ${usernames.length} users`);

    for (const username of usernames) {
      console.log(`[Cache] Would warm up 24h cache for ${username}`);
    }
  } catch (error) {
    console.error(`[Cache] Failed to warm up bio public cache:`, error);
  }
}
