import { redis } from "@/lib/redis";
import { primarySql } from "@/server/neon";
import {
  CLICK_CACHE_TTL_SECONDS,
  clickCacheKey,
} from "@/lib/conversions/constants";

export interface ClickAttribution {
  clickId: string;
  linkId: string;
  workspaceId: string;
  slug: string;
  url: string;
  domain: string;
  country?: string;
  createdAt: string;
}

/** Persist clickId → link mapping (Redis + Postgres) for conversion attribution. */
export async function storeClickAttribution(
  data: ClickAttribution,
): Promise<void> {
  await Promise.allSettled([
    redis.set(clickCacheKey(data.clickId), data, {
      ex: CLICK_CACHE_TTL_SECONDS,
    }),
    primarySql`
      INSERT INTO "tracked_clicks" (
        id, "linkId", "workspaceId", slug, url, domain, country, "createdAt"
      ) VALUES (
        ${data.clickId},
        ${data.linkId},
        ${data.workspaceId},
        ${data.slug},
        ${data.url},
        ${data.domain},
        ${data.country ?? null},
        ${data.createdAt}
      )
      ON CONFLICT (id) DO NOTHING
    `,
  ]);
}

export async function resolveClickAttribution(
  clickId: string,
): Promise<ClickAttribution | null> {
  if (!clickId) return null;

  try {
    const cached = await redis.get<ClickAttribution>(clickCacheKey(clickId));
    if (cached?.linkId && cached.workspaceId) {
      return cached;
    }
  } catch {
    // fall through to DB
  }

  const rows = await primarySql`
    SELECT
      id as "clickId",
      "linkId",
      "workspaceId",
      slug,
      url,
      domain,
      country,
      "createdAt"
    FROM "tracked_clicks"
    WHERE id = ${clickId}
    LIMIT 1
  `;

  const row = rows[0] as
    | {
        clickId: string;
        linkId: string;
        workspaceId: string;
        slug: string;
        url: string;
        domain: string;
        country: string | null;
        createdAt: string | Date;
      }
    | undefined;

  if (!row) return null;

  const attribution: ClickAttribution = {
    clickId: row.clickId,
    linkId: row.linkId,
    workspaceId: row.workspaceId,
    slug: row.slug,
    url: row.url,
    domain: row.domain,
    country: row.country ?? undefined,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : new Date(row.createdAt).toISOString(),
  };

  void redis
    .set(clickCacheKey(clickId), attribution, { ex: CLICK_CACHE_TTL_SECONDS })
    .catch(() => undefined);

  return attribution;
}
