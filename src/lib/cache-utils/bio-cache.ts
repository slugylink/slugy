import { redis, CACHE_BASE_TTL, CACHE_TTL_JITTER } from "@/lib/redis";

// Types for bio cache
type BioCacheType = {
  username: string;
  userId: string;
} | null;

// Type guard for BioCacheType
function isBioCacheType(obj: unknown): obj is BioCacheType {
  return (
    !!obj &&
    typeof obj === "object" &&
    typeof (obj as { username?: unknown }).username === "string" &&
    typeof (obj as { userId?: unknown }).userId === "string"
  );
}

// Get default bio cache
export async function getDefaultBioCache(userId: string): Promise<BioCacheType> {
  const cacheKey = `bio:default:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    const parsed = cached
      ? typeof cached === "string"
        ? JSON.parse(cached)
        : cached
      : null;
      console.log("fetched default bio ✨");
    if (isBioCacheType(parsed)) return parsed;
  } catch {}
  return null;
}

// Set default bio cache
export async function setDefaultBioCache(
  userId: string,
  data: BioCacheType,
): Promise<void> {
  const cacheKey = `bio:default:${userId}`;
  try {
    await redis.set(cacheKey, JSON.stringify(data), {
      ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
    });
  } catch {}
}

// Get bio by username cache
export async function getBioByUsernameCache(username: string): Promise<BioCacheType> {
  const cacheKey = `bio:username:${username}`;
  try {
    const cached = await redis.get(cacheKey);
    const parsed = cached
      ? typeof cached === "string"
        ? JSON.parse(cached)
        : cached
      : null;
    if (isBioCacheType(parsed)) return parsed;
  } catch {}
  return null;
}

// Set bio by username cache
export async function setBioByUsernameCache(
  username: string,
  data: BioCacheType,
): Promise<void> {
  const cacheKey = `bio:username:${username}`;
  try {
    await redis.set(cacheKey, JSON.stringify(data), {
      ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
    });
  } catch {}
}

// Invalidate bio caches
export async function invalidateBioCache(userId: string): Promise<void> {
  try {
    // Delete specific keys
    await Promise.all([
      redis.del(`bio:default:${userId}`),
    ]);
    
    console.log(`Bio cache invalidated for user: ${userId}`);
  } catch (error) {
    console.error(`Failed to invalidate bio cache for user ${userId}:`, error);
  }
}

// Invalidate specific bio cache by username
export async function invalidateBioByUsername(username: string): Promise<void> {
  const cacheKey = `bio:username:${username}`;
  try {
    await redis.del(cacheKey);
  } catch (error) {
    console.error(`Failed to invalidate bio cache for username ${username}:`, error);
  }
}

// Invalidate bio cache by username and user ID
export async function invalidateBioByUsernameAndUser(username: string, userId: string): Promise<void> {
  try {
    await Promise.all([
      redis.del(`bio:username:${username}`),
      redis.del(`bio:default:${userId}`),
    ]);
  } catch (error) {
    console.error(`Failed to invalidate bio cache for ${username}:${userId}:`, error);
  }
}
