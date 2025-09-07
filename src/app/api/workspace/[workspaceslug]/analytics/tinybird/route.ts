import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sql } from "@/server/neon";

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
const CACHE_DURATION = 60; // 2 minutes
const STALE_WHILE_REVALIDATE = 120; // 4 minutes

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

// Transform Tinybird data to analytics format
function transformTinybirdData(
  tinybirdData: TinybirdResponse["data"],
  requestedMetrics: AnalyticsMetric[],
  timePeriod: TimePeriod = "7d",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (requestedMetrics.includes("totalClicks")) {
    result.totalClicks = tinybirdData.reduce(
      (sum, item) => sum + item.clicks,
      0,
    );
  }

  if (requestedMetrics.includes("clicksOverTime")) {
    const timeMap = new Map<string, number>();

    tinybirdData.forEach((item) => {
      // Parse the day string and create a proper date for grouping
      const dayDate = new Date(item.day);

      // Determine grouping granularity based on time period
      let timeKey: string;

      if (timePeriod === "24h") {
        // For 24h period, group by hour
        // Normalize to start of hour to ensure consistent grouping
        const hourDate = new Date(dayDate);
        hourDate.setMinutes(0, 0, 0); // Set to start of hour
        timeKey = hourDate.toISOString();
      } else if (timePeriod === "7d" || timePeriod === "30d") {
        // For 7d, 30d periods, group by day
        if (item.day.includes("T")) {
          timeKey = dayDate.toISOString().split("T")[0]; // YYYY-MM-DD format
        } else {
          timeKey = item.day;
        }
      } else {
        // For 3m, 12m, all periods, group by month
        if (item.day.includes("T")) {
          // Extract year-month from timestamp (e.g., "2024-09-02T14:30:00" -> "2024-09")
          const yearMonth = dayDate.toISOString().substring(0, 7); // YYYY-MM format
          timeKey = yearMonth + "-01"; // Add day 1 for consistency
        } else {
          // If it's already a date string, extract year-month
          const yearMonth = item.day.substring(0, 7); // YYYY-MM format
          timeKey = yearMonth + "-01"; // Add day 1 for consistency
        }
      }

      timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + item.clicks);
    });

    const aggregatedData = Array.from(timeMap.entries())
      .map(([time, clicks]) => ({
        time: new Date(time),
        clicks,
      }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    result.clicksOverTime = aggregatedData;
  }

  if (requestedMetrics.includes("links")) {
    const linksMap = new Map<
      string,
      { slug: string; url: string; clicks: number }
    >();
    tinybirdData.forEach((item) => {
      const key = `${item["meta.slug"]}-${item["meta.url"]}`;
      const existing = linksMap.get(key);
      if (existing) {
        existing.clicks += item.clicks;
      } else {
        linksMap.set(key, {
          slug: item["meta.slug"],
          url: item["meta.url"],
          clicks: item.clicks,
        });
      }
    });
    result.links = Array.from(linksMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  if (requestedMetrics.includes("cities")) {
    const citiesMap = new Map<
      string,
      { city: string; country: string; clicks: number }
    >();
    tinybirdData.forEach((item) => {
      if (item.city) {
        const key = `${item.city}-${item.country}`;
        const existing = citiesMap.get(key);
        if (existing) {
          existing.clicks += item.clicks;
        } else {
          citiesMap.set(key, {
            city: item.city,
            country: item.country || "unknown",
            clicks: item.clicks,
          });
        }
      }
    });
    result.cities = Array.from(citiesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  if (requestedMetrics.includes("countries")) {
    const countriesMap = new Map<string, { country: string; clicks: number }>();
    tinybirdData.forEach((item) => {
      if (item.country) {
        const existing = countriesMap.get(item.country);
        if (existing) {
          existing.clicks += item.clicks;
        } else {
          countriesMap.set(item.country, {
            country: item.country,
            clicks: item.clicks,
          });
        }
      }
    });
    result.countries = Array.from(countriesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  if (requestedMetrics.includes("continents")) {
    const continentsMap = new Map<
      string,
      { continent: string; clicks: number }
    >();
    tinybirdData.forEach((item) => {
      if (item.continent) {
        const existing = continentsMap.get(item.continent);
        if (existing) {
          existing.clicks += item.clicks;
        } else {
          continentsMap.set(item.continent, {
            continent: item.continent,
            clicks: item.clicks,
          });
        }
      }
    });
    result.continents = Array.from(continentsMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  if (requestedMetrics.includes("devices")) {
    const devicesMap = new Map<string, { device: string; clicks: number }>();
    tinybirdData.forEach((item) => {
      if (item.device) {
        const existing = devicesMap.get(item.device);
        if (existing) {
          existing.clicks += item.clicks;
        } else {
          devicesMap.set(item.device, {
            device: item.device,
            clicks: item.clicks,
          });
        }
      }
    });
    result.devices = Array.from(devicesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  if (requestedMetrics.includes("browsers")) {
    const browsersMap = new Map<string, { browser: string; clicks: number }>();
    tinybirdData.forEach((item) => {
      if (item.browser) {
        const existing = browsersMap.get(item.browser);
        if (existing) {
          existing.clicks += item.clicks;
        } else {
          browsersMap.set(item.browser, {
            browser: item.browser,
            clicks: item.clicks,
          });
        }
      }
    });
    result.browsers = Array.from(browsersMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  if (requestedMetrics.includes("oses")) {
    const osesMap = new Map<string, { os: string; clicks: number }>();
    tinybirdData.forEach((item) => {
      if (item.os && item.os !== "unknown") {
        const existing = osesMap.get(item.os);
        if (existing) {
          existing.clicks += item.clicks;
        } else {
          osesMap.set(item.os, {
            os: item.os,
            clicks: item.clicks,
          });
        }
      }
    });
    result.oses = Array.from(osesMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  if (requestedMetrics.includes("referrers")) {
    const referrersMap = new Map<
      string,
      { referrer: string; clicks: number }
    >();
    tinybirdData.forEach((item) => {
      if (item.referer) {
        const existing = referrersMap.get(item.referer);
        if (existing) {
          existing.clicks += item.clicks;
        } else {
          referrersMap.set(item.referer, {
            referrer: item.referer,
            clicks: item.clicks,
          });
        }
      }
    });
    result.referrers = Array.from(referrersMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  if (requestedMetrics.includes("destinations")) {
    const destinationsMap = new Map<
      string,
      { destination: string; clicks: number }
    >();
    tinybirdData.forEach((item) => {
      const existing = destinationsMap.get(item["meta.url"]);
      if (existing) {
        existing.clicks += item.clicks;
      } else {
        destinationsMap.set(item["meta.url"], {
          destination: item["meta.url"],
          clicks: item.clicks,
        });
      }
    });
    result.destinations = Array.from(destinationsMap.values()).sort(
      (a, b) => b.clicks - a.clicks,
    );
  }

  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const { workspaceslug } = await params;
    const search = new URL(request.url).searchParams;

    // Parse and validate input parameters
    const raw = {
      timePeriod: (search.get("time_period") as TimePeriod) || "24h",
      slug_key: search.get("slug_key"),
      country_key: search.get("country_key"),
      city_key: search.get("city_key"),
      continent_key: search.get("continent_key"),
      browser_key: search.get("browser_key"),
      os_key: search.get("os_key"),
      referrer_key: search.get("referrer_key"),
      device_key: search.get("device_key"),
      destination_key: search.get("destination_key"),
      metrics: search.get("metrics")
        ? (search.get("metrics")!.split(",") as ClientMetric[])
        : undefined,
    };

    const props = analyticsPropsSchema.parse(raw);

    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

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
      return NextResponse.json(
        { error: "Workspace not found", code: "WORKSPACE_NOT_FOUND" },
        { status: 404 },
      );
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
    };

    // Determine which metrics to fetch
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
    const response = await fetch(tinybirdEndpoint, {
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(
        `Tinybird API error: ${response.status} ${response.statusText}`,
      );
      return NextResponse.json(
        {
          error: "Analytics service temporarily unavailable",
          code: "SERVICE_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    const tinybirdResponse: TinybirdResponse = await response.json();

    // Transform data to expected format
    const analyticsData = transformTinybirdData(
      tinybirdResponse.data,
      normalizedMetrics,
      props.timePeriod,
    );

    // Set response headers for better performance
    const responseObj = NextResponse.json(analyticsData);

    // Cache headers for better performance
    responseObj.headers.set(
      "Cache-Control",
      `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
    );

    // Performance and debugging headers
    responseObj.headers.set("X-Analytics-Metrics", normalizedMetrics.join(","));
    responseObj.headers.set("X-Analytics-Period", props.timePeriod);
    responseObj.headers.set("X-Analytics-Cache", `${CACHE_DURATION}s`);
    responseObj.headers.set(
      "X-Tinybird-Rows",
      tinybirdResponse.rows.toString(),
    );
    responseObj.headers.set(
      "X-Tinybird-Elapsed",
      tinybirdResponse.statistics.elapsed.toString(),
    );

    return responseObj;
  } catch (err) {
    console.error("Tinybird Analytics API error:", err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: err.errors,
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
