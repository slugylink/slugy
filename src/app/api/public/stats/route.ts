import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { db } from "@/server/db";
import { redis } from "@/lib/redis";

const CACHE_KEY = "public:site-stats";
/** Hard TTL: after this the next request recomputes (revalidates). */
const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h
/** Serve stale for up to a week while the CDN revalidates in the background. */
const STALE_SECONDS = 60 * 60 * 24 * 7;

interface SiteStats {
  users: number;
  links: number;
  clicks: number;
  cachedAt: string;
}

const CACHE_HEADERS = {
  "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
} as const;

async function computeStats(): Promise<Omit<SiteStats, "cachedAt">> {
  const [users, links, clicks] = await Promise.all([
    db.user.count(),
    db.link.count({ where: { deletedAt: null } }),
    db.analytics.count(),
  ]);
  return { users, links, clicks };
}

async function writeCache(
  data: Omit<SiteStats, "cachedAt">,
): Promise<SiteStats> {
  const payload: SiteStats = { ...data, cachedAt: new Date().toISOString() };
  await redis
    .set(CACHE_KEY, JSON.stringify(payload), { ex: CACHE_TTL_SECONDS })
    .catch(() => undefined);
  return payload;
}

/**
 * Public platform totals for the landing page.
 *
 * Cached 24h in Redis; the first request after expiry recomputes and
 * re-caches. If the cached read fails (Redis down) we still compute fresh.
 * Numbers always come from the database — never hardcoded.
 */
export async function GET() {
  try {
    const cached = await redis.get<string>(CACHE_KEY).catch(() => null);

    if (cached) {
      const payload =
        typeof cached === "string" ? (JSON.parse(cached) as SiteStats) : cached;

      // Serve cache immediately; refresh in the background if the record
      // predates the TTL window (Redis may briefly outlive `ex`).
      const ageMs = payload.cachedAt
        ? Date.now() - new Date(payload.cachedAt).getTime()
        : 0;
      if (ageMs > CACHE_TTL_SECONDS * 1000) {
        waitUntil(
          computeStats()
            .then(writeCache)
            .catch((error) =>
              console.error("[Public Stats] Background refresh failed:", error),
            ),
        );
      }

      return NextResponse.json(payload, { headers: CACHE_HEADERS });
    }

    const payload = await writeCache(await computeStats());
    return NextResponse.json(payload, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[Public Stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
