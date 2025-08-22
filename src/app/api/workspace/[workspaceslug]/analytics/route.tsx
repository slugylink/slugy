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

// --- Data Processing ---

function initMaps(metrics: AnalyticsMetric[]): AggregationMaps {
  const maps: AggregationMaps = {};
  if (metrics.includes("clicksOverTime")) maps.clicksOverTime = new Map();
  if (metrics.includes("cities")) maps.cities = new Map();
  if (metrics.includes("countries")) maps.countries = new Map();
  if (metrics.includes("continents")) maps.continents = new Map();
  if (metrics.includes("devices")) maps.devices = new Map();
  if (metrics.includes("browsers")) maps.browsers = new Map();
  if (metrics.includes("oses")) maps.oses = new Map();
  if (metrics.includes("referrers")) maps.referrers = new Map();
  if (metrics.includes("destinations")) maps.destinations = new Map();
  return maps;
}

function processRecords(
  records: RawRecord[],
  startDate: Date,
  links: LinkInfo[],
  metrics: AnalyticsMetric[],
): { maps: AggregationMaps; linkClicks: Map<string, number> } {
  const maps = initMaps(metrics);
  const urlByLink = new Map(links.map((l) => [l.id, l.url]));
  const linkClicks = new Map<string, number>();

  for (const r of records) {
    // Total clicks per link
    linkClicks.set(r.linkId, (linkClicks.get(r.linkId) ?? 0) + r._count);

    // Clicks over time
    if (maps.clicksOverTime) {
      let keyDate: Date;
      const elapsed = Date.now() - startDate.getTime();
      if (elapsed <= 24 * 3600 * 1000) keyDate = roundToHour(r.clickedAt);
      else if (elapsed <= 30 * 24 * 3600 * 1000)
        keyDate = roundToDay(r.clickedAt);
      else
        keyDate = new Date(
          r.clickedAt.getFullYear(),
          r.clickedAt.getMonth(),
          1,
        );

      const key = keyDate.toISOString();
      maps.clicksOverTime.set(
        key,
        (maps.clicksOverTime.get(key) ?? 0) + r._count,
      );
    }

    // Cities
    if (maps.cities) {
      const key = `${r.city ?? "Unknown"}|${r.country ?? "Unknown"}`;
      const existing = maps.cities.get(key) ?? {
        city: r.city ?? "Unknown",
        country: r.country ?? "Unknown",
        clicks: 0,
      };
      existing.clicks += r._count;
      maps.cities.set(key, existing);
    }

    // Generic increments
    const inc = (map: Map<string, number> | undefined, key: string) => {
      if (map) map.set(key, (map.get(key) ?? 0) + r._count);
    };
    inc(maps.countries, r.country ?? "Unknown");
    inc(maps.continents, r.continent ?? "Unknown");
    inc(maps.devices, r.device ?? "Unknown");
    inc(maps.browsers, r.browser ?? "Unknown");
    inc(maps.oses, r.os ?? "Unknown");
    inc(maps.referrers, r.referer ?? "Unknown");
    if (maps.destinations) {
      const dest = urlByLink.get(r.linkId) ?? "Unknown";
      inc(maps.destinations, dest);
    }
  }

  return { maps, linkClicks };
}

function buildResponse(
  maps: AggregationMaps,
  links: LinkInfo[],
  linkClicks: Map<string, number>,
  metrics: AnalyticsMetric[],
): AnalyticsResponse {
  const resp: AnalyticsResponse = {};

  if (metrics.includes("totalClicks") && maps.clicksOverTime) {
    resp.totalClicks = Array.from(maps.clicksOverTime.values()).reduce(
      (a, b) => a + b,
      0,
    );
  }
  if (maps.clicksOverTime) {
    resp.clicksOverTime = Array.from(maps.clicksOverTime.entries())
      .map(([t, c]) => ({ time: new Date(t), clicks: c }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }
  if (metrics.includes("links")) {
    resp.links = links.map((l) => ({
      slug: l.slug,
      url: l.url,
      clicks: linkClicks.get(l.id) ?? 0,
    }));
  }
  if (maps.cities) {
    resp.cities = Array.from(maps.cities.values());
  }
  if (maps.countries) {
    resp.countries = Array.from(maps.countries.entries()).map(
      ([country, clicks]) => ({ country, clicks }),
    );
  }
  if (maps.continents) {
    resp.continents = Array.from(maps.continents.entries()).map(
      ([continent, clicks]) => ({ continent, clicks }),
    );
  }
  if (maps.devices) {
    resp.devices = Array.from(maps.devices.entries()).map(
      ([device, clicks]) => ({ device, clicks }),
    );
  }
  if (maps.browsers) {
    resp.browsers = Array.from(maps.browsers.entries()).map(
      ([browser, clicks]) => ({ browser, clicks }),
    );
  }
  if (maps.oses) {
    resp.oses = Array.from(maps.oses.entries()).map(([os, clicks]) => ({
      os,
      clicks,
    }));
  }
  if (maps.referrers) {
    resp.referrers = Array.from(maps.referrers.entries()).map(
      ([referrer, clicks]) => ({ referrer, clicks }),
    );
  }
  if (maps.destinations) {
    resp.destinations = Array.from(maps.destinations.entries()).map(
      ([destination, clicks]) => ({ destination, clicks }),
    );
  }

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

    const linkIds = [...new Set(rawData.map((r) => r.linkId))];
    const links = await db.link.findMany({
      where: { id: { in: linkIds } },
      select: { id: true, slug: true, url: true },
    });

    const { maps, linkClicks } = processRecords(
      rawData as RawRecord[],
      startDate,
      links,
      metrics,
    );
    const result = buildResponse(maps, links, linkClicks, metrics);

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
