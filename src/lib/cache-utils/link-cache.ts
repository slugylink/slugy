import { redis, CACHE_BASE_TTL } from "@/lib/redis";
import type { GeoTargetMap } from "@/lib/link-targeting";

export type LinkCacheType = {
  id: string;
  url: string;
  expiresAt: string | null;
  expirationUrl: string | null;
  password: string | null;
  workspaceId: string;
  domain: string;
  title: string | null;
  image: string | null;
  metadesc?: string | null;
  description: string | null;
  geo?: GeoTargetMap | null;
} | null;

const NEGATIVE_CACHE_TTL_SECONDS = 30;
const NEGATIVE_CACHE_VALUE = "__missing__";

function cacheKey(slug: string, domain: string): string {
  return `link:${domain}:${slug}`;
}

function negativeCacheKey(slug: string, domain: string): string {
  return `link-miss:${domain}:${slug}`;
}

function linkCacheTtl(): number {
  // Jitter per write so isolates don't expire in lockstep
  return CACHE_BASE_TTL + Math.floor(Math.random() * 10) * 60;
}

// Invalidate link cache (+ negative miss marker)
export async function invalidateLinkCache(
  slug: string,
  domain: string = "slugy.co",
): Promise<void> {
  try {
    await redis.del(cacheKey(slug, domain), negativeCacheKey(slug, domain));
  } catch (error) {
    console.error(`Failed to invalidate cache for ${domain}/${slug}:`, error);
  }
}

export async function invalidateLinkCacheBatch(
  slugs: string[],
  domain: string = "slugy.co",
): Promise<void> {
  await Promise.all(slugs.map((slug) => invalidateLinkCache(slug, domain)));
}

function isLinkCacheType(obj: unknown): obj is NonNullable<LinkCacheType> {
  if (!obj || typeof obj !== "object") return false;

  const o = obj as Record<string, unknown>;

  return (
    typeof o.id === "string" &&
    typeof o.url === "string" &&
    "expiresAt" in o &&
    "expirationUrl" in o &&
    "password" in o &&
    typeof o.workspaceId === "string" &&
    typeof o.domain === "string" &&
    "title" in o &&
    "image" in o &&
    "description" in o
  );
}

export async function getLinkCache(
  slug: string,
  domain: string = "slugy.co",
): Promise<LinkCacheType | "missing"> {
  try {
    const miss = await redis.get(negativeCacheKey(slug, domain));
    if (miss === NEGATIVE_CACHE_VALUE || miss === "1") {
      return "missing";
    }

    const cached = await redis.get(cacheKey(slug, domain));
    const parsed = cached
      ? typeof cached === "string"
        ? JSON.parse(cached)
        : cached
      : null;
    if (isLinkCacheType(parsed)) return parsed;
  } catch {
    // ignore
  }
  return null;
}

export async function setLinkCache(
  slug: string,
  data: LinkCacheType,
  domain: string = "slugy.co",
): Promise<void> {
  if (!data) return;
  try {
    const pipeline = redis.pipeline();
    pipeline.set(cacheKey(slug, domain), JSON.stringify(data), {
      ex: linkCacheTtl(),
    });
    pipeline.del(negativeCacheKey(slug, domain));
    await pipeline.exec();
  } catch {
    // ignore
  }
}

/** Cache a miss briefly so random-slug floods don't hammer Neon. */
export async function setNegativeLinkCache(
  slug: string,
  domain: string = "slugy.co",
): Promise<void> {
  try {
    await redis.set(negativeCacheKey(slug, domain), NEGATIVE_CACHE_VALUE, {
      ex: NEGATIVE_CACHE_TTL_SECONDS,
    });
  } catch {
    // ignore
  }
}
