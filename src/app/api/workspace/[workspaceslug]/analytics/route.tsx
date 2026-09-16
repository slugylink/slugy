import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/server/neon";
import { z } from "zod";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { analyticsFilterFieldsSchema } from "@/lib/analytics/query-params";

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
const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
};
const MAX_RESULTS = 100;

export const dynamic = "force-dynamic";

// Validation schema with better error messages
const analyticsPropsSchema = analyticsFilterFieldsSchema
  .omit({ domain_key: true })
  .extend({
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
          "os",
          "oses",
          "referrers",
          "destinations",
        ]),
      )
      .optional(),
  })
  .strict();

// Optimized date calculation
function getStartDate(period: TimePeriod): Date {
  if (period === "all") return new Date(0);

  const now = new Date();
  const multipliers = {
    "24h": () => now.setHours(now.getHours() - 24),
    "7d": () => now.setDate(now.getDate() - 7),
    "30d": () => now.setDate(now.getDate() - 30),
    "3m": () => now.setMonth(now.getMonth() - 3),
    "12m": () => now.setMonth(now.getMonth() - 12),
  };

  multipliers[period]();
  return now;
}

// Helper function to build filter conditions with better performance
function buildFilterConditions(filters: Record<string, string>) {
  const conditions: ReturnType<typeof sql>[] = [];

  const append = (
    value: string | undefined,
    clause: (bound: string) => ReturnType<typeof sql>,
  ) => {
    const trimmed = value?.trim();
    if (trimmed) conditions.push(clause(trimmed));
  };

  append(filters.slug, (value) => sql`l.slug = ${value}`);
  append(filters.destination, (value) => sql`l.url = ${value}`);
  append(filters.country, (value) => sql`a.country = ${value}`);
  append(filters.city, (value) => sql`a.city = ${value}`);
  append(filters.continent, (value) => sql`a.continent = ${value}`);
  append(filters.browser, (value) => sql`a.browser = ${value}`);
  append(filters.os, (value) => sql`a.os = ${value}`);
  append(filters.referrer, (value) => sql`a.referer = ${value}`);
  append(filters.device, (value) => sql`a.device = ${value}`);

  if (conditions.length === 0) return sql``;
  if (conditions.length === 1) return sql`AND ${conditions[0]}`;

  let result = sql`AND ${conditions[0]}`;
  for (let i = 1; i < conditions.length; i++) {
    result = sql`${result} AND ${conditions[i]}`;
  }
  return result;
}

function timeBucketExpr(periodUnit: string) {
  if (periodUnit === "hour") {
    return sql`date_trunc('hour', a."clickedAt")`;
  }
  if (periodUnit === "month") {
    return sql`date_trunc('month', a."clickedAt")`;
  }
  return sql`date_trunc('day', a."clickedAt")`;
}

// Optimized query for specific metrics with better error handling
async function fetchMetricData(
  metric: AnalyticsMetric,
  baseWhereClause: ReturnType<typeof sql>,
  periodUnit: string,
) {
  try {
    switch (metric) {
      case "totalClicks":
        const totalResult = await sql`
          SELECT COUNT(*) as total_clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
        `;
        return totalResult[0]?.total_clicks || 0;

      case "clicksOverTime":
        const timeResult = await sql`
          SELECT 
            ${timeBucketExpr(periodUnit)} AS time_period,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
          GROUP BY time_period
          ORDER BY time_period
        `;
        return timeResult.map((row) => ({
          time: row.time_period,
          clicks: Number(row.clicks),
        }));

      case "links":
        const linksResult = await sql`
          SELECT 
            l.slug,
            l.url,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
          GROUP BY l.slug, l.url
          ORDER BY clicks DESC
          LIMIT ${MAX_RESULTS}
        `;
        return linksResult.map((row) => ({
          slug: row.slug,
          url: row.url,
          clicks: Number(row.clicks),
        }));

      case "cities":
        const citiesResult = await sql`
          SELECT 
            a.city,
            a.country,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
            AND a.city IS NOT NULL
          GROUP BY a.city, a.country
          ORDER BY clicks DESC
          LIMIT ${MAX_RESULTS}
        `;
        return citiesResult.map((row) => ({
          city: row.city,
          country: row.country,
          clicks: Number(row.clicks),
        }));

      case "countries":
        const countriesResult = await sql`
          SELECT 
            a.country,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
            AND a.country IS NOT NULL
          GROUP BY a.country
          ORDER BY clicks DESC
          LIMIT ${MAX_RESULTS}
        `;
        return countriesResult.map((row) => ({
          country: row.country,
          clicks: Number(row.clicks),
        }));

      case "continents":
        const continentsResult = await sql`
          SELECT 
            a.continent,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
            AND a.continent IS NOT NULL
          GROUP BY a.continent
          ORDER BY clicks DESC
          LIMIT ${MAX_RESULTS}
        `;
        return continentsResult.map((row) => ({
          continent: row.continent,
          clicks: Number(row.clicks),
        }));

      case "devices":
        const devicesResult = await sql`
          SELECT 
            a.device,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
            AND a.device IS NOT NULL
          GROUP BY a.device
          ORDER BY clicks DESC
          LIMIT ${MAX_RESULTS}
        `;
        return devicesResult.map((row) => ({
          device: row.device,
          clicks: Number(row.clicks),
        }));

      case "browsers":
        const browsersResult = await sql`
          SELECT 
            a.browser,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
            AND a.browser IS NOT NULL
          GROUP BY a.browser
          ORDER BY clicks DESC
          LIMIT ${MAX_RESULTS}
        `;
        return browsersResult.map((row) => ({
          browser: row.browser,
          clicks: Number(row.clicks),
        }));

      case "oses":
        const osesResult = await sql`
          SELECT 
            a.os,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
            AND a.os IS NOT NULL
          GROUP BY a.os
          ORDER BY clicks DESC
          LIMIT ${MAX_RESULTS}
        `;
        return osesResult.map((row) => ({
          os: row.os,
          clicks: Number(row.clicks),
        }));

      case "referrers":
        const referrersResult = await sql`
          SELECT 
            a.referer,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
            AND a.referer IS NOT NULL
          GROUP BY a.referer
          ORDER BY clicks DESC
          LIMIT ${MAX_RESULTS}
        `;
        return referrersResult.map((row) => ({
          referrer: row.referer,
          clicks: Number(row.clicks),
        }));

      case "destinations":
        const destinationsResult = await sql`
          SELECT 
            l.url,
            COUNT(*) AS clicks
          FROM "analytics" a
          JOIN "links" l ON a."linkId" = l.id
          JOIN "workspaces" w ON l."workspaceId" = w.id
          WHERE ${baseWhereClause}
          GROUP BY l.url
          ORDER BY clicks DESC
          LIMIT ${MAX_RESULTS}
        `;
        return destinationsResult.map((row) => ({
          destination: row.url,
          clicks: Number(row.clicks),
        }));

      default:
        return null;
    }
  } catch (error) {
    console.error(`Error fetching metric ${metric}:`, error);
    throw new Error(`Failed to fetch ${metric} data`);
  }
}

// Helper function to determine period unit
function getPeriodUnit(timePeriod: TimePeriod): string {
  const periodMap = {
    "24h": "hour",
    "7d": "day",
    "30d": "day",
    "3m": "month",
    "12m": "month",
    all: "month",
  };
  return periodMap[timePeriod];
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

    const access = await requireWorkspaceAccess(workspaceslug);
    if (!access.ok) {
      return access.response;
    }

    // Calculate start date and period unit
    const startDate = getStartDate(props.timePeriod);
    const periodUnit = getPeriodUnit(props.timePeriod);

    // Build filters object
    const filters: Record<string, string> = {};
    const filterKeys = [
      "slug_key",
      "country_key",
      "city_key",
      "continent_key",
      "browser_key",
      "os_key",
      "referrer_key",
      "device_key",
      "destination_key",
    ] as const;

    filterKeys.forEach((key) => {
      const value = props[key];
      if (value) {
        filters[key.replace("_key", "")] = value;
      }
    });

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

    // Build base where clause with performance optimization
    const baseWhereClause = sql`
      a."clickedAt" >= ${startDate}
      AND w.id = ${access.workspace.id}
      AND w."deletedAt" IS NULL
      ${buildFilterConditions(filters)}
    `;

    // Early return if no metrics requested
    if (normalizedMetrics.length === 0) {
      return NextResponse.json(
        {},
        {
          headers: PRIVATE_NO_STORE,
        },
      );
    }

    // Fetch requested metrics in parallel with better error handling
    const metricPromises = normalizedMetrics.map(async (metric) => {
      try {
        const data = await fetchMetricData(metric, baseWhereClause, periodUnit);
        return { metric, data, success: true };
      } catch (error) {
        console.error(`Error fetching metric ${metric}:`, error);
        return {
          metric,
          data: null,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const metricResults = await Promise.all(metricPromises);

    // Build response object with successful results only
    const results: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    metricResults.forEach(({ metric, data, success, error }) => {
      if (success && data !== null) {
        results[metric] = data;
      } else if (!success) {
        errors[metric] = error || "Unknown error";
      }
    });

    console.log("Analytics API response:", results);

    // Set response headers for better performance
    const response = NextResponse.json({
      ...results,
      ...(Object.keys(errors).length > 0 && { _errors: errors }),
    });

    response.headers.set("Cache-Control", PRIVATE_NO_STORE["Cache-Control"]);
    response.headers.set("Vary", PRIVATE_NO_STORE.Vary);

    // Performance and debugging headers
    response.headers.set("X-Analytics-Metrics", normalizedMetrics.join(","));
    response.headers.set("X-Analytics-Period", props.timePeriod);

    return response;
  } catch (err) {
    console.error("Analytics API error:", err);

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
