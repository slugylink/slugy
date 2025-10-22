import { redis, CACHE_BASE_TTL, CACHE_TTL_JITTER } from "@/lib/redis";

type LinkCacheType = {
  id: string;
  url: string;
  expiresAt: string | null;
  expirationUrl: string | null;
  password: string | null;
  workspaceId: string;
  domain: string;
} | null;

// Invalidate link cache
export async function invalidateLinkCache(slug: string, domain: string = "slugy.co"): Promise<void> {
  const cacheKey = `link:${domain}:${slug}`;
  try {
    await redis.del(cacheKey);
    // console.log(`Cache invalidated for key ⚡: ${cacheKey}`);
  } catch (error) {
    console.error(`Failed to invalidate cache for key ${cacheKey}:`, error);
  }
}

// Invalidate multiple link caches
export async function invalidateLinkCacheBatch(slugs: string[], domain: string = "slugy.co"): Promise<void> {
  await Promise.all(slugs.map((slug) => invalidateLinkCache(slug, domain)));
}

function isLinkCacheType(obj: unknown): obj is LinkCacheType {
  return (
    !!obj &&
    typeof obj === "object" &&
    typeof (obj as { id?: unknown }).id === "string" &&
    typeof (obj as { url?: unknown }).url === "string" &&
    "expiresAt" in obj &&
    "expirationUrl" in obj &&
    "password" in obj &&
    typeof (obj as { workspaceId?: unknown }).workspaceId === "string" &&
    typeof (obj as { domain?: unknown }).domain === "string"
  );
}

// Get link cache
export async function getLinkCache(slug: string, domain: string = "slugy.co"): Promise<LinkCacheType> {
  const cacheKey = `link:${domain}:${slug}`;
  try {
    const cached = await redis.get(cacheKey);
    const parsed = cached
      ? typeof cached === "string"
        ? JSON.parse(cached)
        : cached
      : null;
    if (isLinkCacheType(parsed)) return parsed;
  } catch {}
  return null;
}

// Set link cache
export async function setLinkCache(
  slug: string,
  data: LinkCacheType,
  domain: string = "slugy.co",
): Promise<void> {
  const cacheKey = `link:${domain}:${slug}`;
  try {
    await redis.set(cacheKey, JSON.stringify(data), {
      ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
    });
  } catch {}
}
