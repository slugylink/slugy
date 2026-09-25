import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { redis } from "@/lib/redis";

const CACHE_KEY = "public:site-stats";
const CACHE_TTL_SECONDS = 60 * 60;

/**
 * Public platform totals for the landing page. Cached hourly —
 * these numbers must always come from the database, never hardcoded.
 */
export async function GET() {
  try {
    const cached = await redis.get<string>(CACHE_KEY).catch(() => null);
    if (cached) {
      const payload = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    const [users, links, clicks] = await Promise.all([
      db.user.count(),
      db.link.count({ where: { deletedAt: null } }),
      db.analytics.count(),
    ]);

    const payload = { users, links, clicks };
    await redis
      .set(CACHE_KEY, JSON.stringify(payload), { ex: CACHE_TTL_SECONDS })
      .catch(() => undefined);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[Public Stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
