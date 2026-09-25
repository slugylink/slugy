import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { verifyLinkPassword } from "@/lib/link-password";
import {
  formatAnalyticsResponse,
  getStartDate,
  processAnalyticsData,
  type AnalyticsMetric,
  type TimePeriod,
} from "@/server/actions/analytics/analytics";

const querySchema = z.object({
  timePeriod: z.enum(["24h", "7d", "30d", "3m", "12m", "all"]).default("30d"),
  password: z.string().max(72).optional(),
  country_key: z.string().max(100).optional(),
  city_key: z.string().max(100).optional(),
  continent_key: z.string().max(100).optional(),
  device_key: z.string().max(50).optional(),
  browser_key: z.string().max(50).optional(),
  os_key: z.string().max(50).optional(),
  referrer_key: z.string().max(500).optional(),
});

const SHARE_METRICS: AnalyticsMetric[] = [
  "totalClicks",
  "clicksOverTime",
  "countries",
  "cities",
  "continents",
  "devices",
  "browsers",
  "oses",
  "referrers",
];

/**
 * Public client-report endpoint. No auth — access is gated by the
 * unguessable publicId plus an optional share password.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  try {
    const { publicId } = await params;
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      timePeriod: url.searchParams.get("timePeriod") ?? undefined,
      password: url.searchParams.get("password") ?? undefined,
      country_key: url.searchParams.get("country_key") ?? undefined,
      city_key: url.searchParams.get("city_key") ?? undefined,
      continent_key: url.searchParams.get("continent_key") ?? undefined,
      device_key: url.searchParams.get("device_key") ?? undefined,
      browser_key: url.searchParams.get("browser_key") ?? undefined,
      os_key: url.searchParams.get("os_key") ?? undefined,
      referrer_key: url.searchParams.get("referrer_key") ?? undefined,
    });
    if (!parsed.success) {
      return jsonWithETag(
        req,
        { message: "Invalid query parameters" },
        { status: 400 },
      );
    }

    const shared = await db.sharedAnalytics.findFirst({
      where: { publicId, isPublic: true, deletedAt: null },
      include: {
        link: {
          select: {
            id: true,
            slug: true,
            url: true,
            domain: true,
            createdAt: true,
            workspace: { select: { name: true, slug: true, logo: true } },
          },
        },
      },
    });

    if (!shared || !shared.link) {
      return jsonWithETag(req, { error: "Report not found" }, { status: 404 });
    }

    const requiresPassword = Boolean(shared.password);
    if (requiresPassword) {
      const ok = verifyLinkPassword(
        parsed.data.password ?? "",
        shared.password,
      );
      if (!ok) {
        return jsonWithETag(
          req,
          {
            requiresPassword: true,
            error: parsed.data.password
              ? "Incorrect password"
              : "This report is password protected",
          },
          { status: parsed.data.password ? 403 : 401 },
        );
      }
    }

    const timePeriod: TimePeriod = parsed.data.timePeriod;
    const startDate = getStartDate(timePeriod);

    // Short-TTL cache: reports are read-heavy and shared externally, so
    // repeat views (same period + filters) should not re-run groupBy.
    // Keyed per publicId + period + filters; only reachable after the
    // password check above, so gated reports never leak through cache.
    const cacheKey = [
      "share:report",
      publicId,
      timePeriod,
      parsed.data.country_key ?? "",
      parsed.data.city_key ?? "",
      parsed.data.continent_key ?? "",
      parsed.data.device_key ?? "",
      parsed.data.browser_key ?? "",
      parsed.data.os_key ?? "",
      parsed.data.referrer_key ?? "",
    ].join(":");
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        const payload =
          typeof cached === "string" ? JSON.parse(cached) : cached;
        return jsonWithETag(req, payload, {
          status: 200,
          headers: {
            "Cache-Control":
              "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
            "X-Cache": "HIT",
          },
        });
      }
    } catch {
      // Redis down — fall through to DB.
    }

    const rawAggregates = await db.analytics.groupBy({
      by: [
        "linkId",
        "clickedAt",
        "country",
        "city",
        "continent",
        "device",
        "browser",
        "os",
        "referer",
      ],
      where: {
        linkId: shared.link.id,
        clickedAt: { gte: startDate },
        ...(parsed.data.country_key
          ? { country: parsed.data.country_key }
          : {}),
        ...(parsed.data.city_key ? { city: parsed.data.city_key } : {}),
        ...(parsed.data.continent_key
          ? { continent: parsed.data.continent_key }
          : {}),
        ...(parsed.data.device_key ? { device: parsed.data.device_key } : {}),
        ...(parsed.data.browser_key
          ? { browser: parsed.data.browser_key }
          : {}),
        ...(parsed.data.os_key ? { os: parsed.data.os_key } : {}),
        ...(parsed.data.referrer_key
          ? { referer: parsed.data.referrer_key }
          : {}),
      },
      _count: true,
    });

    const links = [
      { id: shared.link.id, slug: shared.link.slug, url: shared.link.url },
    ];
    const linkClicksMap = new Map<string, number>();
    for (const entry of rawAggregates) {
      linkClicksMap.set(
        entry.linkId,
        (linkClicksMap.get(entry.linkId) ?? 0) + entry._count,
      );
    }

    const aggregationMaps = processAnalyticsData(
      rawAggregates,
      timePeriod,
      links,
      SHARE_METRICS,
    );
    const analytics = formatAnalyticsResponse(
      aggregationMaps,
      links,
      linkClicksMap,
      SHARE_METRICS,
    );

    const payload = {
      link: {
        slug: shared.link.slug,
        url: shared.link.url,
        domain: shared.link.domain,
        createdAt: shared.link.createdAt,
      },
      workspace: {
        name: shared.link.workspace.name,
        logo: shared.link.workspace.logo,
      },
      allowIndexing: shared.allowIndexing,
      timePeriod,
      analytics,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(payload), { ex: 60 });
    } catch {
      // Cache write failure must not fail the request.
    }

    return jsonWithETag(req, payload, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Error fetching shared report:", error);
    return jsonWithETag(
      req,
      { message: "An error occurred while fetching the report." },
      { status: 500 },
    );
  }
}
