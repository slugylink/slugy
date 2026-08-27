import { redis } from "@/lib/redis";
import { CLICK_CACHE_TTL_SECONDS, clickCacheKey } from "@/lib/leads/constants";

export interface CachedClickAttribution {
  clickId: string;
  linkId: string;
  workspaceId: string;
  slug: string;
  url: string;
  domain: string;
  country: string;
  city: string;
  continent: string;
  device: string;
  browser: string;
  os: string;
  referer: string;
  timestamp: string;
}

export async function cacheClickAttribution(
  data: CachedClickAttribution,
): Promise<void> {
  try {
    await redis.set(clickCacheKey(data.clickId), JSON.stringify(data), {
      ex: CLICK_CACHE_TTL_SECONDS,
    });
  } catch (error) {
    console.error("[cacheClickAttribution]", error);
  }
}

export async function getClickAttribution(
  clickId: string,
): Promise<CachedClickAttribution | null> {
  try {
    const raw = await redis.get<string>(clickCacheKey(clickId));
    if (!raw) return null;
    const parsed =
      typeof raw === "string"
        ? (JSON.parse(raw) as CachedClickAttribution)
        : (raw as CachedClickAttribution);
    return parsed?.linkId ? parsed : null;
  } catch (error) {
    console.error("[getClickAttribution]", error);
    return null;
  }
}

export async function resolveClickAttribution(
  clickId: string,
): Promise<CachedClickAttribution | null> {
  const cached = await getClickAttribution(clickId);
  if (cached) return cached;

  const { db } = await import("@/server/db");
  const row = await db.analytics.findFirst({
    where: { clickId },
    orderBy: { clickedAt: "desc" },
    select: {
      clickId: true,
      linkId: true,
      country: true,
      city: true,
      continent: true,
      device: true,
      browser: true,
      os: true,
      referer: true,
      clickedAt: true,
      link: {
        select: {
          id: true,
          workspaceId: true,
          slug: true,
          url: true,
          domain: true,
        },
      },
    },
  });

  if (!row?.clickId || !row.link) return null;

  return {
    clickId: row.clickId,
    linkId: row.link.id,
    workspaceId: row.link.workspaceId,
    slug: row.link.slug,
    url: row.link.url,
    domain: row.link.domain,
    country: row.country ?? "",
    city: row.city ?? "",
    continent: row.continent ?? "",
    device: row.device ?? "",
    browser: row.browser ?? "",
    os: row.os ?? "",
    referer: row.referer ?? "Direct",
    timestamp: row.clickedAt.toISOString(),
  };
}
