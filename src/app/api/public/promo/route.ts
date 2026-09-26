import { NextResponse } from "next/server";
import { getPromoStatus } from "@/lib/subscription/promo";
import { redis } from "@/lib/redis";

const CACHE_KEY = "public:promo-status";
const CACHE_TTL_SECONDS = 60;
const STALE_SECONDS = 600;

const CACHE_HEADERS = {
  "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
} as const;

/**
 * Public live redemption count for the GETPRO promo.
 * Polled by the landing page — cheap (60s Redis cache), never 500s the
 * homepage: falls back to a freshly computed status on cache failure.
 */
export async function GET() {
  try {
    const cached = await redis.get<string>(CACHE_KEY).catch(() => null);
    if (cached) {
      const payload = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json(payload, { headers: CACHE_HEADERS });
    }

    const status = await getPromoStatus();
    await redis
      .set(CACHE_KEY, JSON.stringify(status), { ex: CACHE_TTL_SECONDS })
      .catch(() => undefined);
    return NextResponse.json(status, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[Public Promo] Error:", error);
    try {
      return NextResponse.json(await getPromoStatus(), {
        headers: CACHE_HEADERS,
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to load promo status" },
        { status: 500 },
      );
    }
  }
}
