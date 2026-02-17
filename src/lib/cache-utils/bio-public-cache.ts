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
    style?: string | null;
    icon?: string | null;
    image?: string | null;
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
    // Validate input data
    if (!username || typeof username !== "string") {
      console.error(
        `[Cache] Invalid username provided for caching: ${username}`,
      );
      return;
    }

    if (!data || typeof data !== "object") {
      console.error(
        `[Cache] Invalid data provided for caching username: ${username}`,
      );
      return;
    }

    const cacheKey = generateCacheKey(username);
    const cacheData: BioPublicCache = {
      ...data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL * 1000,
    };

    // Ensure data is serializable
    const serializedData = JSON.stringify(cacheData);

    await redis.setex(cacheKey, CACHE_TTL, serializedData);

    // Set a longer TTL for stale-while-revalidate (48 hours)
    const staleKey = `${cacheKey}:stale`;
    await redis.setex(staleKey, STALE_WHILE_REVALIDATE, serializedData);

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

    let cachedData = await redis.get<BioPublicCache | string>(cacheKey);

    if (!cachedData) {
      const staleKey = `${cacheKey}:stale`;
      cachedData = await redis.get<BioPublicCache | string>(staleKey);

      if (cachedData) {
        console.log(`[Cache] Using stale cache for ${username} (48h)`);
      }
    }

    if (!cachedData) {
      return null;
    }

    // Handle both parsed object and JSON string cases (Upstash Redis can return parsed objects)
    let parsedData: BioPublicCache;

    if (typeof cachedData === "string") {
      try {
        parsedData = JSON.parse(cachedData);
      } catch (parseError) {
        console.error(
          `[Cache] Failed to parse cached data for ${username}:`,
          parseError,
        );
        return null;
      }
    } else if (typeof cachedData === "object" && cachedData !== null) {
      // Upstash Redis returns parsed object directly
      parsedData = cachedData as BioPublicCache;
    } else {
      console.error(
        `[Cache] Invalid cached data type for ${username}:`,
        typeof cachedData,
      );
      return null;
    }

    // Validate that we have the required fields
    if (!parsedData.username || !parsedData.cachedAt || !parsedData.expiresAt) {
      console.error(`[Cache] Invalid cached data structure for ${username}`);
      return null;
    }

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

    // Handle Upstash Redis keys format
    const keyStrings = keys.map((key) =>
      typeof key === "string" ? key : String(key),
    );

    if (keyStrings.length > 0) {
      // Delete keys in batches to avoid overwhelming Redis
      const batchSize = 100;
      for (let i = 0; i < keyStrings.length; i += batchSize) {
        const batch = keyStrings.slice(i, i + batchSize);
        await redis.del(...batch);
      }
      console.log(
        `[Cache] Cleared ${keyStrings.length} bio public cache entries`,
      );
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

    // Handle Upstash Redis keys format (might return strings or objects)
    const keyStrings = keys.map((key) =>
      typeof key === "string" ? key : String(key),
    );

    const freshKeys = keyStrings.filter(
      (key) => !key.includes(":stale"),
    ).length;
    const staleKeys = keyStrings.filter((key) => key.includes(":stale")).length;

    return {
      totalKeys: keyStrings.length,
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

// Utility function to clean up corrupted cache entries
export async function cleanCorruptedCache(): Promise<void> {
  try {
    const pattern = `${CACHE_PREFIX}*`;
    const keys = await redis.keys(pattern);

    let cleanedCount = 0;
    for (const key of keys) {
      const keyString = typeof key === "string" ? key : String(key);
      try {
        const cachedData = await redis.get<BioPublicCache | string>(keyString);

        if (cachedData) {
          // Try to validate the cache data
          let parsedData: BioPublicCache;

          if (typeof cachedData === "string") {
            parsedData = JSON.parse(cachedData);
          } else if (typeof cachedData === "object" && cachedData !== null) {
            parsedData = cachedData as BioPublicCache;
          } else {
            // Invalid data type, delete the key
            await redis.del(keyString);
            cleanedCount++;
            continue;
          }

          // Validate required fields
          if (
            !parsedData.username ||
            !parsedData.cachedAt ||
            !parsedData.expiresAt
          ) {
            await redis.del(keyString);
            cleanedCount++;
          }
        }
      } catch (error) {
        // If we can't parse or validate, delete the corrupted entry
        await redis.del(keyString);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Cache] Cleaned ${cleanedCount} corrupted cache entries`);
    }
  } catch (error) {
    console.error(`[Cache] Failed to clean corrupted cache:`, error);
  }
}
