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

// Input validation schema
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
  metrics: z.array(z.string()).optional(),
});

// All metrics (default)
const ALL_METRICS: AnalyticsMetric[] = [
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
];

export async function getAnalytics(
  props: AnalyticsRequestProps,
): Promise<AnalyticsResponse> {
  try {
    // Validate input
    const safeProps = AnalyticsPropsSchema.parse(props);
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) throw new Error("User not authenticated");

    const startDate = getStartDate(safeProps.timePeriod);
    const metrics: AnalyticsMetric[] =
      (safeProps.metrics as AnalyticsMetric[]) ?? ALL_METRICS;

    // Combined query to get all analytics data at once
    const analyticsData = await db.analytics.groupBy({
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

    // Get unique link IDs for fetching link details
    const linkIds = [...new Set(analyticsData.map((item) => item.linkId))];

    // Fetch link details in parallel with data processing
    const [links, linkClicksMap] = await Promise.all([
      db.link.findMany({
        where: { id: { in: linkIds } },
        select: {
          id: true,
          slug: true,
          url: true,
        },
      }),
      // Create a map of link clicks for faster lookup
      Promise.resolve(
        new Map(
          analyticsData.reduce((acc, curr) => {
            acc.set(curr.linkId, (acc.get(curr.linkId) ?? 0) + curr._count);
            return acc;
          }, new Map<string, number>()),
        ),
      ),
    ]);

    const aggregationMaps = processAnalyticsData(
      analyticsData,
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
    // Log error for observability
    console.error("[getAnalytics] Error:", error);
    // Return a safe error message
    throw new Error("Failed to fetch analytics data. Please try again later.");
  }
}
