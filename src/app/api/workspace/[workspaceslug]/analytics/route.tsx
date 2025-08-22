import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";

// --- Types & Constants ---

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

const PERIODS: Record<
  Exclude<TimePeriod, "all">,
  Partial<{ hours: number; days: number; months: number }>
> = {
  "24h": { hours: 24 },
  "7d": { days: 7 },
  "30d": { days: 30 },
  "3m": { months: 3 },
  "12m": { months: 12 },
};

const AnalyticsPropsSchema = z.object({
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
  metrics: z.array(z.enum(ALL_METRICS)).optional(),
});

// Data record from Prisma
interface RawRecord {
  linkId: string;
  clickedAt: Date;
  country: string | null;
  city: string | null;
  continent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referer: string | null;
  _count: number;
}

interface LinkInfo {
  id: string;
  slug: string;
  url: string;
}

interface ClicksOverTimeEntry {
  time: Date;
  clicks: number;
}

interface LinkAnalytics {
  slug: string;
  url: string;
  clicks: number;
}

interface CityEntry {
  city: string;
  country: string;
  clicks: number;
}

interface CountryEntry {
  country: string;
  clicks: number;
}

interface ContinentEntry {
  continent: string;
  clicks: number;
}

interface DeviceEntry {
  device: string;
  clicks: number;
}

interface BrowserEntry {
  browser: string;
  clicks: number;
}

interface OsEntry {
  os: string;
  clicks: number;
}

interface ReferrerEntry {
  referrer: string;
  clicks: number;
}

interface DestinationEntry {
  destination: string;
  clicks: number;
}

interface AnalyticsResponse {
  totalClicks?: number;
  clicksOverTime?: ClicksOverTimeEntry[];
  links?: LinkAnalytics[];
  cities?: CityEntry[];
  countries?: CountryEntry[];
  continents?: ContinentEntry[];
  devices?: DeviceEntry[];
  browsers?: BrowserEntry[];
  oses?: OsEntry[];
  referrers?: ReferrerEntry[];
  destinations?: DestinationEntry[];
}

interface AggregationMaps {
  clicksOverTime?: Map<string, number>;
  cities?: Map<string, CityEntry>;
  countries?: Map<string, number>;
  continents?: Map<string, number>;
  devices?: Map<string, number>;
  browsers?: Map<string, number>;
  oses?: Map<string, number>;
  referrers?: Map<string, number>;
  destinations?: Map<string, number>;
}

// --- Date Helpers ---

function roundToHour(d: Date): Date {
  const dt = new Date(d);
  dt.setMinutes(0, 0, 0);
  return dt;
}

function roundToDay(d: Date): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function getStartDate(period: TimePeriod): Date {
  if (period === "all") return new Date(0);
  const now = new Date();
  const { hours, days, months } = PERIODS[period]!;
  if (hours) now.setHours(now.getHours() - hours);
  if (days) now.setDate(now.getDate() - days);
  if (months) now.setMonth(now.getMonth() - months);
  return now;
}

// --- Optimized Data Processing ---

// Use more efficient data structures and avoid Maps for simple aggregations
interface AggregatedData {
  clicksOverTime: Record<string, number>;
  cities: Record<string, { city: string; country: string; clicks: number }>;
  countries: Record<string, number>;
  continents: Record<string, number>;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  oses: Record<string, number>;
  referrers: Record<string, number>;
  destinations: Record<string, number>;
  linkClicks: Record<string, number>;
}

function aggregateData(
  records: RawRecord[],
  startDate: Date,
  links: LinkInfo[],
  metrics: AnalyticsMetric[],
): AggregatedData {
  const data: AggregatedData = {
    clicksOverTime: {},
    cities: {},
    countries: {},
    continents: {},
    devices: {},
    browsers: {},
    oses: {},
    referrers: {},
    destinations: {},
    linkClicks: {},
  };

  // Create lookup map for links (more efficient than repeated lookups)
  const linkMap = new Map(links.map(l => [l.id, l]));

  for (const r of records) {
    // Aggregate link clicks
    data.linkClicks[r.linkId] = (data.linkClicks[r.linkId] ?? 0) + r._count;

    // Aggregate clicks over time
    if (metrics.includes("clicksOverTime")) {
      let keyDate: Date;
      const elapsed = Date.now() - startDate.getTime();
      if (elapsed <= 24 * 3600 * 1000) keyDate = roundToHour(r.clickedAt);
      else if (elapsed <= 30 * 24 * 3600 * 1000) keyDate = roundToDay(r.clickedAt);
      else keyDate = new Date(r.clickedAt.getFullYear(), r.clickedAt.getMonth(), 1);
      
      const key = keyDate.toISOString();
      data.clicksOverTime[key] = (data.clicksOverTime[key] ?? 0) + r._count;
    }

    // Aggregate cities
    if (metrics.includes("cities")) {
      const cityKey = `${r.city ?? "Unknown"}|${r.country ?? "Unknown"}`;
      if (!data.cities[cityKey]) {
        data.cities[cityKey] = { city: r.city ?? "Unknown", country: r.country ?? "Unknown", clicks: 0 };
      }
      data.cities[cityKey].clicks += r._count;
    }

    // Aggregate other metrics efficiently
    const inc = (obj: Record<string, number>, key: string) => {
      obj[key] = (obj[key] ?? 0) + r._count;
    };

    if (metrics.includes("countries")) inc(data.countries, r.country ?? "Unknown");
    if (metrics.includes("continents")) inc(data.continents, r.continent ?? "Unknown");
    if (metrics.includes("devices")) inc(data.devices, r.device ?? "Unknown");
    if (metrics.includes("browsers")) inc(data.browsers, r.browser ?? "Unknown");
    if (metrics.includes("oses")) inc(data.oses, r.os ?? "Unknown");
    if (metrics.includes("referrers")) inc(data.referrers, r.referer ?? "Unknown");
    
    if (metrics.includes("destinations")) {
      const link = linkMap.get(r.linkId);
      const dest = link?.url ?? "Unknown";
      inc(data.destinations, dest);
    }
  }

  return data;
}

function buildResponse(
  data: AggregatedData,
  links: LinkInfo[],
  metrics: AnalyticsMetric[],
): AnalyticsResponse {
  const resp: AnalyticsResponse = {};

  // Calculate total clicks from clicks over time
  if (metrics.includes("totalClicks")) {
    resp.totalClicks = Object.values(data.clicksOverTime).reduce((a, b) => a + b, 0);
  }

  // Format clicks over time
  if (metrics.includes("clicksOverTime")) {
    resp.clicksOverTime = Object.entries(data.clicksOverTime)
      .map(([time, clicks]) => ({ time: new Date(time), clicks }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  // Format links
  if (metrics.includes("links")) {
    resp.links = links.map((l) => ({
      slug: l.slug,
      url: l.url,
      clicks: data.linkClicks[l.id] ?? 0,
    }));
  }

  // Format other metrics efficiently
  if (metrics.includes("cities")) resp.cities = Object.values(data.cities);
  if (metrics.includes("countries")) resp.countries = Object.entries(data.countries).map(([country, clicks]) => ({ country, clicks }));
  if (metrics.includes("continents")) resp.continents = Object.entries(data.continents).map(([continent, clicks]) => ({ continent, clicks }));
  if (metrics.includes("devices")) resp.devices = Object.entries(data.devices).map(([device, clicks]) => ({ device, clicks }));
  if (metrics.includes("browsers")) resp.browsers = Object.entries(data.browsers).map(([browser, clicks]) => ({ browser, clicks }));
  if (metrics.includes("oses")) resp.oses = Object.entries(data.oses).map(([os, clicks]) => ({ os, clicks }));
  if (metrics.includes("referrers")) resp.referrers = Object.entries(data.referrers).map(([referrer, clicks]) => ({ referrer, clicks }));
  if (metrics.includes("destinations")) resp.destinations = Object.entries(data.destinations).map(([destination, clicks]) => ({ destination, clicks }));

  return resp;
}

// --- API Route Handler ---

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
      page: search.get("page") ? +search.get("page")! : undefined,
      pageSize: search.get("pageSize") ? +search.get("pageSize")! : undefined,
      metrics: search.get("metrics")
        ? (search.get("metrics")!.split(",") as AnalyticsMetric[])
        : undefined,
    };
    const props = AnalyticsPropsSchema.parse(raw);

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const startDate = getStartDate(props.timePeriod);
    const metrics =
      props.metrics ?? [...ALL_METRICS];

    const rawData = await db.analytics.groupBy({
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
            slug: workspaceslug,
            OR: [
              { userId: session.user.id },
              { members: { some: { userId: session.user.id } } },
            ],
          },
          ...(props.slug_key && { slug: props.slug_key }),
          ...(props.destination_key && { url: props.destination_key }),
        },
        clickedAt: { gte: startDate },
        ...(props.country_key && { country: props.country_key }),
        ...(props.city_key && { city: props.city_key }),
        ...(props.continent_key && { continent: props.continent_key }),
        ...(props.browser_key && { browser: props.browser_key }),
        ...(props.os_key && { os: props.os_key }),
        ...(props.referrer_key && { referer: props.referrer_key }),
        ...(props.device_key && { device: props.device_key }),
      },
      _count: true,
    });

    // Get unique link IDs and fetch link data in a single query
    const linkIds = [...new Set(rawData.map((r) => r.linkId))];
    const links = await db.link.findMany({
      where: { id: { in: linkIds } },
      select: { id: true, slug: true, url: true },
    });

    const aggregatedData = aggregateData(
      rawData as RawRecord[],
      startDate,
      links,
      metrics,
    );
    const result = buildResponse(aggregatedData, links, metrics);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analytics API error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
