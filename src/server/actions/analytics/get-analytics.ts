import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import {
  type AnalyticsRequestProps,
  type AnalyticsResponse,
  getStartDate,
  processAnalyticsData,
  formatAnalyticsResponse,
  AnalyticsMetric,
} from "./analytics";
import { z } from "zod";
import { headers } from "next/headers";

// Input schema with metrics type safety
const ALL_METRICS = [
  "totalClicks",
  "clicksOverTime",
  "links",
  "cities",
  "countries",
  "continents",
  "devices",
  "browsers",
  "oses",
  "referrers",
  "destinations",
] as const;

const AnalyticsPropsSchema = z.object({
  workspaceslug: z.string().min(1),
  timePeriod: z.enum(["24h", "7d", "30d", "3m", "12m", "all"]),
  slug_key: z.string().nullable().optional(),
  country_key: z.string().nullable().optional(),
  city_key: z.string().nullable().optional(),
  continent_key: z.string().nullable().optional(),
  browser_key: z.string().nullable().optional(),
  os_key: z.string().nullable().optional(),
  referrer_key: z.string().nullable().optional(),
  device_key: z.string().nullable().optional(),
  destination_key: z.string().nullable().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  metrics: z.array(z.enum(ALL_METRICS)).optional()
});

export async function getAnalytics(
  props: AnalyticsRequestProps,
): Promise<AnalyticsResponse> {
  try {
    // 1 Validate input
    const safeProps = AnalyticsPropsSchema.parse(props);

    // 2️ Auth & access control
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      throw new Error("User not authenticated");
    }

    // 3️ Time period & metrics selection
    const startDate = getStartDate(safeProps.timePeriod);
    const metrics = (safeProps.metrics ?? ALL_METRICS) as AnalyticsMetric[];

    // 4️ Core grouped analytics query
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
        link: {
          workspace: {
            slug: safeProps.workspaceslug,
            OR: [
              { userId: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
          ...(safeProps.slug_key ? { slug: safeProps.slug_key } : {}),
          ...(safeProps.destination_key
            ? { url: safeProps.destination_key }
            : {}),
        },
        clickedAt: { gte: startDate },
        ...(safeProps.country_key ? { country: safeProps.country_key } : {}),
        ...(safeProps.city_key ? { city: safeProps.city_key } : {}),
        ...(safeProps.continent_key
          ? { continent: safeProps.continent_key }
          : {}),
        ...(safeProps.browser_key ? { browser: safeProps.browser_key } : {}),
        ...(safeProps.os_key ? { os: safeProps.os_key } : {}),
        ...(safeProps.referrer_key ? { referer: safeProps.referrer_key } : {}),
        ...(safeProps.device_key ? { device: safeProps.device_key } : {}),
      },
      _count: true,
    });

    // 5️⃣ Gather related link data & clicks map
    const linkIds = [...new Set(rawAggregates.map((item) => item.linkId))];

    const links = await db.link.findMany({
      where: { id: { in: linkIds } },
      select: {
        id: true,
        slug: true,
        url: true,
      },
    });

    const linkClicksMap = new Map<string, number>();
    for (const entry of rawAggregates) {
      linkClicksMap.set(
        entry.linkId,
        (linkClicksMap.get(entry.linkId) ?? 0) + entry._count,
      );
    }

    // 6️⃣ Aggregate and format
    const aggregationMaps = processAnalyticsData(
      rawAggregates,
      safeProps.timePeriod,
      links,
      metrics,
    );

    return formatAnalyticsResponse(
      aggregationMaps,
      links,
      linkClicksMap,
      metrics,
    );
  } catch (error) {
    console.error("[getAnalytics] Error:", error);
    throw new Error("Failed to fetch analytics data. Please try again later.");
  }
}
