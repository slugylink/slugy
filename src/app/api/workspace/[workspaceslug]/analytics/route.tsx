import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/server/neon";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
    metrics: z.array(z.enum(ALL_METRICS)).optional(),
  })
  .strict();

function getStartDate(period: TimePeriod): Date {
  if (period === "all") return new Date(0);
  const now = new Date();
  switch (period) {
    case "24h":
      now.setHours(now.getHours() - 24);
      break;
    case "7d":
      now.setDate(now.getDate() - 7);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
    case "3m":
      now.setMonth(now.getMonth() - 3);
      break;
    case "12m":
      now.setMonth(now.getMonth() - 12);
      break;
  }
  return now;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const { workspaceslug } = await params;
    const search = new URL(request.url).searchParams;

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
        ? (search.get("metrics")!.split(",") as AnalyticsMetric[])
        : undefined,
    };
    const props = analyticsPropsSchema.parse(raw);

    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startDate = getStartDate(props.timePeriod);
    const filters: Record<string, string> = {};
    for (const key of [
      "slug_key",
      "country_key",
      "city_key",
      "continent_key",
      "browser_key",
      "os_key",
      "referrer_key",
      "device_key",
      "destination_key",
    ] as const) {
      const v = props[key];
      if (v) {
        filters[key.replace("_key", "")] = v;
      }
    }

    const periodUnit =
      props.timePeriod === "24h"
        ? "hour"
        : props.timePeriod === "7d" || props.timePeriod === "30d"
          ? "day"
          : "month";

    const metrics: readonly AnalyticsMetric[] = props.metrics ?? ALL_METRICS;

    const baseWhereClause = sql`
      a."clickedAt" >= ${startDate}
      AND w.slug = ${workspaceslug}
      AND (
        w."userId" = ${session.user.id}
        OR EXISTS (
          SELECT 1 FROM "members" wm
          WHERE wm."workspaceId" = w.id
            AND wm."userId" = ${session.user.id}
        )
      )
      ${filters.slug ? sql`AND l.slug = ${filters.slug}` : sql``}
      ${filters.destination ? sql`AND l.url = ${filters.destination}` : sql``}
      ${filters.country ? sql`AND a.country = ${filters.country}` : sql``}
      ${filters.city ? sql`AND a.city = ${filters.city}` : sql``}
      ${filters.continent ? sql`AND a.continent = ${filters.continent}` : sql``}
      ${filters.browser ? sql`AND a.browser = ${filters.browser}` : sql``}
      ${filters.os ? sql`AND a.os = ${filters.os}` : sql``}
      ${filters.referrer ? sql`AND a.referer = ${filters.referrer}` : sql``}
      ${filters.device ? sql`AND a.device = ${filters.device}` : sql``}
    `;

    const rows = await sql`
      WITH base_data AS (
        SELECT
          a."clickedAt",
          a.country,
          a.city,
          a.continent,
          a.browser,
          a.os,
          a.referer,
          a.device,
          l.slug,
          l.url,
          date_trunc(${periodUnit}, a."clickedAt") AS time_period
        FROM "analytics" a
        JOIN "links" l ON a."linkId" = l.id
        JOIN "workspaces" w ON l."workspaceId" = w.id
        WHERE ${baseWhereClause}
      )
      
      SELECT
        CASE WHEN GROUPING(time_period) = 0 THEN time_period ELSE NULL END AS time_period,
        CASE WHEN GROUPING(slug) = 0 THEN slug ELSE NULL END AS slug,
        CASE WHEN GROUPING(url) = 0 THEN url ELSE NULL END AS url,
        CASE WHEN GROUPING(city) = 0 THEN city ELSE NULL END AS city,
        CASE WHEN GROUPING(country) = 0 THEN country ELSE NULL END AS country,
        CASE WHEN GROUPING(continent) = 0 THEN continent ELSE NULL END AS continent,
        CASE WHEN GROUPING(device) = 0 THEN device ELSE NULL END AS device,
        CASE WHEN GROUPING(browser) = 0 THEN browser ELSE NULL END AS browser,
        CASE WHEN GROUPING(os) = 0 THEN os ELSE NULL END AS os,
        CASE WHEN GROUPING(referer) = 0 THEN referer ELSE NULL END AS referer,
        COUNT(*) AS clicks,
        CASE 
          WHEN GROUPING(time_period) = 0 THEN 'time_series'
          WHEN GROUPING(slug, url) = 0 THEN 'links'
          WHEN GROUPING(city, country) = 0 THEN 'cities'
          WHEN GROUPING(country) = 0 AND GROUPING(city) = 1 THEN 'countries'
          WHEN GROUPING(continent) = 0 THEN 'continents'
          WHEN GROUPING(device) = 0 THEN 'devices'
          WHEN GROUPING(browser) = 0 THEN 'browsers'
          WHEN GROUPING(os) = 0 THEN 'oses'
          WHEN GROUPING(referer) = 0 THEN 'referrers'
          WHEN GROUPING(url) = 0 AND GROUPING(slug) = 1 THEN 'destinations'
          ELSE 'total'
        END AS metric_type
      FROM base_data
      GROUP BY GROUPING SETS (
        (time_period),
        (slug, url),
        (city, country),
        (country),
        (continent),
        (device),
        (browser),
        (os),
        (referer),
        (url),
        ()
      )
      ORDER BY metric_type, time_period NULLS LAST, clicks DESC;
    `;

    // Containers for results
    const results: Record<string, unknown> = {};
    const timeSeriesData: Array<{ time: Date; clicks: number }> = [];
    const links: Array<{ slug: string; url: string; clicks: number }> = [];
    const cities: Array<{ city: string; country: string; clicks: number }> = [];
    const countries: Array<{ country: string; clicks: number }> = [];
    const continents: Array<{ continent: string; clicks: number }> = [];
    const devices: Array<{ device: string; clicks: number }> = [];
    const browsers: Array<{ browser: string; clicks: number }> = [];
    const oses: Array<{ os: string; clicks: number }> = [];
    const referrers: Array<{ referrer: string; clicks: number }> = [];
    const destinations: Array<{ destination: string; clicks: number }> = [];

    for (const row of rows) {
      const clicks = Number(row.clicks);
      const metricType = row.metric_type as string;

      switch (metricType) {
        case "time_series":
          if (row.time_period) {
            timeSeriesData.push({
              time: row.time_period as Date,
              clicks,
            });
          }
          break;
        case "links":
          if (row.slug && row.url) {
            links.push({
              slug: row.slug as string,
              url: row.url as string,
              clicks,
            });
          }
          break;
        case "cities":
          if (row.city && row.country) {
            cities.push({
              city: row.city as string,
              country: row.country as string,
              clicks,
            });
          }
          break;
        case "countries":
          if (row.country) {
            countries.push({
              country: row.country as string,
              clicks,
            });
          }
          break;
        case "continents":
          if (row.continent) {
            continents.push({
              continent: row.continent as string,
              clicks,
            });
          }
          break;
        case "devices":
          if (row.device) {
            devices.push({
              device: row.device as string,
              clicks,
            });
          }
          break;
        case "browsers":
          if (row.browser) {
            browsers.push({
              browser: row.browser as string,
              clicks,
            });
          }
          break;
        case "oses":
          if (row.os) {
            oses.push({
              os: row.os as string,
              clicks,
            });
          }
          break;
        case "referrers":
          if (row.referer) {
            referrers.push({
              referrer: row.referer as string,
              clicks,
            });
          }
          break;
        case "destinations":
          if (row.url) {
            destinations.push({
              destination: row.url as string,
              clicks,
            });
          }
          break;
        default:
        //console.log('Unknown metric type:', metricType, 'for row:', row);
      }
    }

    if (metrics.includes("totalClicks") && results.totalClicks === undefined) {
      results.totalClicks = timeSeriesData.reduce(
        (sum, item) => sum + item.clicks,
        0,
      );
    }
    if (metrics.includes("clicksOverTime"))
      results.clicksOverTime = timeSeriesData;
    if (metrics.includes("links")) results.links = links;
    if (metrics.includes("cities")) results.cities = cities;
    if (metrics.includes("countries")) results.countries = countries;
    if (metrics.includes("continents")) results.continents = continents;
    if (metrics.includes("devices")) results.devices = devices;
    if (metrics.includes("browsers")) results.browsers = browsers;
    if (metrics.includes("oses")) results.oses = oses;
    if (metrics.includes("referrers")) results.referrers = referrers;
    if (metrics.includes("destinations")) results.destinations = destinations;

    return NextResponse.json(results);
  } catch (err) {
    console.error("analytics API error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
