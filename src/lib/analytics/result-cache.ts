import { createHash } from "crypto";
import { waitUntil } from "@vercel/functions";
import { type NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { redis } from "@/lib/redis";

const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
};

// Repeat dashboard views recompute the same multi-second Tinybird pipe.
// Cache the transformed result per workspace+filters for 60s, serve stale
// up to 10 min while refreshing in the background. Clicks keep flowing
// into Tinybird/Neon on the write path — worst case a new event appears
// here ~60s later. Never CDN-shared: per-workspace private data.
const FRESH_TTL_SECONDS = 60;
const STALE_TTL_SECONDS = 600;

interface CachedAnalyticsResult {
  data: unknown;
  storedAt: string;
}

function cacheKey(
  workspaceId: string,
  event: string,
  effectiveProps: Record<string, unknown>,
  normalizedMetrics: string[],
): string {
  const hash = createHash("sha256")
    .update(JSON.stringify({ p: effectiveProps, m: normalizedMetrics }))
    .digest("base64url");
  return `analytics:tb:${event}:${workspaceId}:${hash}`;
}

async function readCached(key: string): Promise<CachedAnalyticsResult | null> {
  try {
    const raw = await redis.get<string | CachedAnalyticsResult>(key);
    const parsed =
      typeof raw === "string"
        ? (JSON.parse(raw) as CachedAnalyticsResult)
        : (raw as CachedAnalyticsResult | null);
    if (!parsed || !parsed.data || !parsed.storedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Serve a Tinybird-backed analytics payload with Redis SWR + ETag.
 * Fail-open: Redis errors degrade to direct compute, never to 500.
 */
export async function serveCachedAnalytics<T>(
  request: Request,
  opts: {
    workspaceId: string;
    event: "clicks" | "leads" | "sales";
    effectiveProps: Record<string, unknown>;
    normalizedMetrics: string[];
    extraHeaders?: Record<string, string>;
    compute: () => Promise<T>;
  },
): Promise<NextResponse> {
  const key = cacheKey(
    opts.workspaceId,
    opts.event,
    opts.effectiveProps,
    opts.normalizedMetrics,
  );
  const headers = (cache: "HIT" | "STALE" | "MISS") => ({
    ...PRIVATE_NO_STORE,
    ...opts.extraHeaders,
    "X-Cache": cache,
  });

  const computeAndStore = async (): Promise<T> => {
    const fresh = await opts.compute();
    await redis
      .set(
        key,
        JSON.stringify({ data: fresh, storedAt: new Date().toISOString() }),
        { ex: STALE_TTL_SECONDS },
      )
      .catch(() => undefined);
    return fresh;
  };

  const cached = await readCached(key);
  if (cached) {
    const ageMs = Date.now() - new Date(cached.storedAt).getTime();
    if (ageMs < FRESH_TTL_SECONDS * 1000) {
      return jsonWithETag(request, cached.data, {
        status: 200,
        headers: headers("HIT"),
      });
    }
    // Stale: serve immediately, refresh behind. Failure keeps stale.
    waitUntil(computeAndStore().catch(() => undefined));
    return jsonWithETag(request, cached.data, {
      status: 200,
      headers: headers("STALE"),
    });
  }

  const fresh = await computeAndStore();
  return jsonWithETag(request, fresh, {
    status: 200,
    headers: headers("MISS"),
  });
}
