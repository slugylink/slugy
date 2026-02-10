import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { sql } from "@/server/neon";
import { apiSuccess, apiErrors } from "@/lib/api-response";

// Types for better type safety
type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";
type AnalyticsMetric =
  | "totalClicks"
  | "clicksOverTime"
  | "links"
  | "cities"
  | "countries"
  | "continents"
  | "devices"
  | "browsers"
  | "oses"
  | "referrers"
  | "destinations";

// Accept both singular and plural forms from client
type ClientMetric =
  | "totalClicks"
  | "clicksOverTime"
  | "links"
  | "cities"
  | "countries"
  | "continents"
  | "devices"
  | "browsers"
  | "os" // Allow singular form
  | "oses" // Allow plural form
  | "referrers"
  | "destinations";

// Constants for better maintainability
const CACHE_DURATION = 60;
const STALE_WHILE_REVALIDATE = 60;

// Validation schema with better error messages
const analyticsPropsSchema = z
  .object({
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
    domain_key: z.string().nullable().optional(),
    metrics: z
      .array(
        z.enum([
          "totalClicks",
          "clicksOverTime",
          "links",
          "cities",
          "countries",
          "continents",
          "devices",
          "browsers",
          "os", // Allow singular form
          "oses", // Allow plural form
          "referrers",
          "destinations",
        ]),
      )
      .optional(),
  })
  .strict();

// Tinybird response type
interface TinybirdResponse {
  meta: Array<{
    name: string;
    type: string;
  }>;
  data: Array<{
    link_id: string;
    day: string;
    clicks: number;
    "meta.slug": string;
    "meta.url": string;
    domain: string;
    country: string;
    city: string;
    continent: string;
    device: string;
    browser: string;
    os: string;
    referer: string;
  }>;
  rows: number;
  statistics: {
    elapsed: number;
    rows_read: number;
    bytes_read: number;
  };
}

// Type for analytics results
type AnalyticsResult =
  | { slug: string; url: string; domain: string; clicks: number }
  | { city: string; country: string; clicks: number }
  | { country: string; clicks: number }
  | { continent: string; clicks: number }
  | { device: string; clicks: number }
  | { browser: string; clicks: number }
  | { os: string; clicks: number }
  | { referrer: string; clicks: number }
  | { destination: string; clicks: number };

// Helper function to aggregate data by key with filtering
function aggregateByKey(
  data: TinybirdResponse["data"],
  keyFn: (item: TinybirdResponse["data"][0]) => string | null,
  createItem: (item: TinybirdResponse["data"][0]) => AnalyticsResult,
  updateItem?: (
    existing: AnalyticsResult,
    item: TinybirdResponse["data"][0],
  ) => void,
): AnalyticsResult[] {
  const map = new Map<string, AnalyticsResult>();

  data.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;

    const existing = map.get(key);
    if (existing) {
      if (updateItem) {
        updateItem(existing, item);
      } else {
        existing.clicks += item.clicks;
      }
    } else {
      map.set(key, createItem(item));
    }
  });

  return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks);
}

// Helper function to get time key based on period
function getTimeKey(day: string, timePeriod: TimePeriod): string {
  const dayDate = new Date(day);

  if (timePeriod === "24h") {
    const hourDate = new Date(dayDate);
    hourDate.setMinutes(0, 0, 0);
    return hourDate.toISOString();
  } else if (timePeriod === "7d" || timePeriod === "30d") {
    return day.includes("T") ? dayDate.toISOString().split("T")[0] : day;
  } else {
    const yearMonth = day.includes("T")
      ? dayDate.toISOString().substring(0, 7)
      : day.substring(0, 7);
    return yearMonth + "-01";
  }
}

// Transform Tinybird data to analytics format
function transformTinybirdData(
  tinybirdData: TinybirdResponse["data"],
  requestedMetrics: AnalyticsMetric[],
  timePeriod: TimePeriod = "7d",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Total clicks - simple aggregation
  if (requestedMetrics.includes("totalClicks")) {
    result.totalClicks = tinybirdData.reduce(
      (sum, item) => sum + item.clicks,
      0,
    );
  }

  // Clicks over time - time-based aggregation
  if (requestedMetrics.includes("clicksOverTime")) {
    const timeMap = new Map<string, number>();

    tinybirdData.forEach((item) => {
      const timeKey = getTimeKey(item.day, timePeriod);
      timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + item.clicks);
    });

    result.clicksOverTime = Array.from(timeMap.entries())
      .map(([time, clicks]) => ({ time: new Date(time), clicks }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  // Use helper function for all other aggregations
  const metricConfigs = {
    links: {
      keyFn: (item: TinybirdResponse["data"][0]) =>
        `${item["meta.slug"]}-${item["meta.url"]}-${item.domain || "slugy.co"}`,
      createItem: (item: TinybirdResponse["data"][0]) => ({
        slug: item["meta.slug"],
        url: item["meta.url"],
        domain: item.domain || "slugy.co",
        clicks: item.clicks,
      }),
    },
    cities: {
      keyFn: (item: TinybirdResponse["data"][0]) =>
        item.city ? `${item.city}-${item.country}` : null,
      createItem: (item: TinybirdResponse["data"][0]) => ({
        city: item.city,
        country: item.country || "unknown",
        clicks: item.clicks,
      }),
    },
    countries: {
      keyFn: (item: TinybirdResponse["data"][0]) => item.country || null,
      createItem: (item: TinybirdResponse["data"][0]) => ({
        country: item.country,
        clicks: item.clicks,
      }),
    },
    continents: {
      keyFn: (item: TinybirdResponse["data"][0]) => item.continent || null,
      createItem: (item: TinybirdResponse["data"][0]) => ({
        continent: item.continent,
        clicks: item.clicks,
      }),
    },
    devices: {
      keyFn: (item: TinybirdResponse["data"][0]) => item.device || null,
      createItem: (item: TinybirdResponse["data"][0]) => ({
        device: item.device,
        clicks: item.clicks,
      }),
    },
    browsers: {
      keyFn: (item: TinybirdResponse["data"][0]) => item.browser || null,
      createItem: (item: TinybirdResponse["data"][0]) => ({
        browser: item.browser,
        clicks: item.clicks,
      }),
    },
    oses: {
      keyFn: (item: TinybirdResponse["data"][0]) =>
        item.os && item.os !== "unknown" ? item.os : null,
      createItem: (item: TinybirdResponse["data"][0]) => ({
        os: item.os,
        clicks: item.clicks,
      }),
    },
    referrers: {
      keyFn: (item: TinybirdResponse["data"][0]) => item.referer || null,
      createItem: (item: TinybirdResponse["data"][0]) => ({
        referrer: item.referer,
        clicks: item.clicks,
      }),
    },
    destinations: {
      keyFn: (item: TinybirdResponse["data"][0]) => item["meta.url"] || null,
      createItem: (item: TinybirdResponse["data"][0]) => ({
        destination: item["meta.url"],
        clicks: item.clicks,
      }),
    },
  } as const;

  // Apply aggregations for requested metrics
  Object.entries(metricConfigs).forEach(([metric, config]) => {
    if (requestedMetrics.includes(metric as AnalyticsMetric)) {
      result[metric] = aggregateByKey(
        tinybirdData,
        config.keyFn,
        config.createItem,
      );
    }
  });

  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const { workspaceslug } = await params;
    const search = new URL(request.url).searchParams;

    // Parse and validate input parameters with defaults applied at API level
    const raw = {
      timePeriod: (search.get("time_period") as TimePeriod) || "24h", // Default to 24h
      slug_key: search.get("slug_key") || null,
      country_key: search.get("country_key") || null,
      city_key: search.get("city_key") || null,
      continent_key: search.get("continent_key") || null,
      browser_key: search.get("browser_key") || null,
      os_key: search.get("os_key") || null,
      referrer_key: search.get("referrer_key") || null,
      device_key: search.get("device_key") || null,
      destination_key: search.get("destination_key") || null,
      domain_key: search.get("domain_key") || null,
      metrics: search.get("metrics")
        ? (search.get("metrics")!.split(",").filter(Boolean) as ClientMetric[])
        : undefined, // Default to all metrics if not provided
    };

    const props = analyticsPropsSchema.parse(raw);

    // Authenticate user
    const authResult = await getAuthSession();
    if (!authResult.success) {
      return apiErrors.unauthorized();
    }
    const session = authResult.session;

    // Get workspace ID from database
    const workspaceResult = await sql`
      SELECT id FROM "workspaces"
      WHERE slug = ${workspaceslug}
      AND "deletedAt" IS NULL
      AND (
        "userId" = ${session.user.id}
        OR EXISTS (
          SELECT 1 FROM "members" m
          WHERE m."workspaceId" = "workspaces".id
            AND m."userId" = ${session.user.id}
        )
      )
    `;

    if (workspaceResult.length === 0) {
      return apiErrors.notFound("Workspace not found");
    }

    const workspaceId = workspaceResult[0].id;

    // Build Tinybird query parameters - all parameters must be passed even if empty
    const tinybirdParams: Record<string, string> = {
      workspace_id: workspaceId,
      date_range: props.timePeriod,
      slug: props.slug_key || "",
      url: props.destination_key || "",
      country: props.country_key || "",
      city: props.city_key || "",
      continent: props.continent_key || "",
      browser: props.browser_key || "",
      os: props.os_key || "",
      referer: props.referrer_key || "",
      device: props.device_key || "",
      domain: props.domain_key || "", // Use domain_key parameter
    };

    // Determine which metrics to fetch (defaults to all if not specified)
    // Client only sends metrics when requesting a subset
    const requestedMetrics = props.metrics || [
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

    // Normalize metrics (convert "os" to "oses")
    const normalizedMetrics = requestedMetrics.map((metric) =>
      metric === "os" ? "oses" : metric,
    ) as AnalyticsMetric[];

    // Build Tinybird query URL
    const queryString = new URLSearchParams(tinybirdParams).toString();
    const tinybirdEndpoint = `https://api.us-east.aws.tinybird.co/v0/pipes/analytics_pipe.json?${queryString}`;

    // Call Tinybird API
    const tinybirdFetchResponse = await fetch(tinybirdEndpoint, {
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
    });

    if (!tinybirdFetchResponse.ok) {
      console.error(
        `Tinybird API error: ${tinybirdFetchResponse.status} ${tinybirdFetchResponse.statusText}`,
      );
      return apiErrors.serviceUnavailable(
        "Analytics service temporarily unavailable",
      );
    }

    const tinybirdResponse: TinybirdResponse =
      await tinybirdFetchResponse.json();
    // Transform data to expected format
    const analyticsData = transformTinybirdData(
      tinybirdResponse.data,
      normalizedMetrics,
      props.timePeriod,
    );

    // Cache headers for better performance
    const cacheHeaders = {
      "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      "X-Analytics-Metrics": normalizedMetrics.join(","),
      "X-Analytics-Period": props.timePeriod,
      "X-Analytics-Cache": `${CACHE_DURATION}s`,
      "X-Tinybird-Rows": tinybirdResponse.rows.toString(),
      "X-Tinybird-Elapsed": tinybirdResponse.statistics.elapsed.toString(),
    };

    // Return analytics data directly (not wrapped) for frontend compatibility
    const response = NextResponse.json(analyticsData, {
      status: 200,
      headers: cacheHeaders,
    });
    return response;
  } catch (err) {
    console.error("Tinybird Analytics API error:", err);

    if (err instanceof z.ZodError) {
      return apiErrors.validationError(err.errors, "Invalid parameters");
    }

    return apiErrors.internalError("Server error");
  }
}
