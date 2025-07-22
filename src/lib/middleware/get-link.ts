import { getCache, setCache } from "@/lib/redis";
import { db } from "@/server/db";

const CACHE_PREFIX = "link:";
const CACHE_EXPIRY = 60 * 60 * 12;

export async function getCachedLink(slug: string) {
  const cacheKey = `${CACHE_PREFIX}${slug}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const link = await db.link.findUnique({
      where: { slug, isArchived: false },
      select: {
        id: true,
        url: true,
        expiresAt: true,
        expirationUrl: true,
        password: true,
        workspaceId: true,
      },
    });

    await setCache(cacheKey, link ?? null, link ? CACHE_EXPIRY : 60 * 5);
    return link;
  } catch (err) {
    console.error("Cache fallback error:", err);
    return null;
  }
}
