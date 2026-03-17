import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { sql } from "@/server/neon";
import { apiErrors } from "@/lib/api-response";

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
  const metricSet = new Set(requestedMetrics);

  const timeMap = metricSet.has("clicksOverTime")
    ? new Map<string, number>()
    : null;
  const linksMap = metricSet.has("links")
    ? new Map<
        string,
        { slug: string; url: string; domain: string; clicks: number }
      >()
    : null;
  const citiesMap = metricSet.has("cities")
    ? new Map<string, { city: string; country: string; clicks: number }>()
    : null;
  const countriesMap = metricSet.has("countries")
    ? new Map<string, { country: string; clicks: number }>()
    : null;
  const continentsMap = metricSet.has("continents")
    ? new Map<string, { continent: string; clicks: number }>()
    : null;
  const devicesMap = metricSet.has("devices")
    ? new Map<string, { device: string; clicks: number }>()
    : null;
  const browsersMap = metricSet.has("browsers")
    ? new Map<string, { browser: string; clicks: number }>()
    : null;
  const osesMap = metricSet.has("oses")
    ? new Map<string, { os: string; clicks: number }>()
    : null;
  const referrersMap = metricSet.has("referrers")
    ? new Map<string, { referrer: string; clicks: number }>()
    : null;
  const destinationsMap = metricSet.has("destinations")
    ? new Map<string, { destination: string; clicks: number }>()
    : null;

  let totalClicks = 0;

  for (const item of tinybirdData) {
    const clicks = item.clicks;
    if (metricSet.has("totalClicks")) totalClicks += clicks;

    if (timeMap) {
      const timeKey = getTimeKey(item.day, timePeriod);
      timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + clicks);
    }

    if (linksMap) {
      const key = `${item["meta.slug"]}-${item["meta.url"]}-${item.domain || "slugy.co"}`;
      const existing = linksMap.get(key);
      if (existing) existing.clicks += clicks;
      else {
        linksMap.set(key, {
          slug: item["meta.slug"],
          url: item["meta.url"],
          domain: item.domain || "slugy.co",
          clicks,
        });
      }
    }

    if (citiesMap && item.city) {
      const key = `${item.city}-${item.country}`;
      const existing = citiesMap.get(key);
      if (existing) existing.clicks += clicks;
      else
        citiesMap.set(key, {
          city: item.city,
          country: item.country || "unknown",
          clicks,
        });
    }

    if (countriesMap && item.country) {
      const existing = countriesMap.get(item.country);
      if (existing) existing.clicks += clicks;
      else countriesMap.set(item.country, { country: item.country, clicks });
    }

    if (continentsMap && item.continent) {
      const existing = continentsMap.get(item.continent);
      if (existing) existing.clicks += clicks;
      else
        continentsMap.set(item.continent, {
          continent: item.continent,
          clicks,
        });
    }

    if (devicesMap && item.device) {
      const existing = devicesMap.get(item.device);
      if (existing) existing.clicks += clicks;
      else devicesMap.set(item.device, { device: item.device, clicks });
    }

    if (browsersMap && item.browser) {
      const existing = browsersMap.get(item.browser);
      if (existing) existing.clicks += clicks;
      else browsersMap.set(item.browser, { browser: item.browser, clicks });
    }

    if (osesMap && item.os && item.os !== "unknown") {
      const existing = osesMap.get(item.os);
      if (existing) existing.clicks += clicks;
      else osesMap.set(item.os, { os: item.os, clicks });
    }

    if (referrersMap && item.referer) {
      const existing = referrersMap.get(item.referer);
      if (existing) existing.clicks += clicks;
      else referrersMap.set(item.referer, { referrer: item.referer, clicks });
    }

    if (destinationsMap && item["meta.url"]) {
      const existing = destinationsMap.get(item["meta.url"]);
      if (existing) existing.clicks += clicks;
      else
        destinationsMap.set(item["meta.url"], {
          destination: item["meta.url"],
          clicks,
        });
    }
  }

  if (metricSet.has("totalClicks")) {
    result.totalClicks = totalClicks;
  }

  if (timeMap) {
    result.clicksOverTime = Array.from(timeMap.entries())
      .map(([time, clicks]) => ({ time: new Date(time), clicks }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  if (linksMap)
    result.links = Array.from(linksMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  if (citiesMap)
    result.cities = Array.from(citiesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  if (countriesMap)
    result.countries = Array.from(countriesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  if (continentsMap)
    result.continents = Array.from(continentsMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  if (devicesMap)
    result.devices = Array.from(devicesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  if (browsersMap)
    result.browsers = Array.from(browsersMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  if (osesMap)
    result.oses = Array.from(osesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  if (referrersMap)
    result.referrers = Array.from(referrersMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  if (destinationsMap)
    result.destinations = Array.from(destinationsMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );

  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const { workspaceslug } = await params;
    const search = request.nextUrl.searchParams;

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
    const normalizedMetrics = Array.from(
      new Set(
        requestedMetrics.map((metric) => (metric === "os" ? "oses" : metric)),
      ),
    ) as AnalyticsMetric[];

    if (!process.env.TINYBIRD_API_KEY) {
      return apiErrors.serviceUnavailable("Analytics service unavailable");
    }

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
