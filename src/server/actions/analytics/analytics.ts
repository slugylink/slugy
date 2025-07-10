import { sub, type Duration } from "date-fns";

/**
 * Analytics time periods supported by the system.
 */
export type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

/**
 * Analytics data for a single link.
 */
export interface LinkAnalytics {
  slug: string;
  url: string;
  clicks: number;
}

/**
 * The full analytics response structure.
 */
export interface AnalyticsResponse {
  totalClicks: number;
  clicksOverTime: Array<{ time: Date; clicks: number }>;
  links: LinkAnalytics[];
  cities: Array<{ city: string; country: string; clicks: number }>;
  countries: Array<{ country: string; clicks: number }>;
  continents: Array<{ continent: string; clicks: number }>;
  devices: Array<{ device: string; clicks: number }>;
  browsers: Array<{ browser: string; clicks: number }>;
  oses: Array<{ os: string; clicks: number }>;
  referrers: Array<{ referrer: string; clicks: number }>;
}

/**
 * Base properties for analytics queries.
 */
export interface BaseAnalyticsProps {
  timePeriod: TimePeriod;
  slug_key?: string | null;
  country_key?: string | null;
  city_key?: string | null;
  continent_key?: string | null;
  browser_key?: string | null;
  os_key?: string | null;
  referrer_key?: string | null;
}

/**
 * Time period durations for analytics queries (except 'all').
 */
export const PERIODS: Record<Exclude<TimePeriod, "all">, Duration> = {
  "24h": { hours: 24 },
  "7d": { days: 7 },
  "30d": { days: 30 },
  "3m": { months: 3 },
  "12m": { months: 12 },
};

/**
 * Rounds a date to the nearest hour.
 */
export function roundToNearestHour(date: Date): Date {
  const rounded = new Date(date);
  rounded.setMinutes(0, 0, 0);
  return rounded;
}

/**
 * Rounds a date to the nearest day.
 */
export function roundToNearestDate(date: Date): Date {
  const rounded = new Date(date);
  rounded.setHours(0, 0, 0, 0);
  return rounded;
}

/**
 * Gets the start date for a given time period.
 */
export function getStartDate(timePeriod: TimePeriod): Date {
  if (timePeriod === "all") return new Date(0);
  const now = new Date();
  return sub(now, PERIODS[timePeriod]);
}

/**
 * Aggregates analytics data into various metrics/maps for response formatting.
 */
export function processAnalyticsData(
  analyticsData: Array<{
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
  }>,
  timePeriod: TimePeriod,
) {
  const aggregationMaps = {
    clicksOverTime: new Map<string, number>(),
    cities: new Map<
      string,
      { city: string; country: string; clicks: number }
    >(),
    countries: new Map<string, number>(),
    continents: new Map<string, number>(),
    devices: new Map<string, number>(),
    browsers: new Map<string, number>(),
    oses: new Map<string, number>(),
    referrers: new Map<string, number>(),
  };

  for (const record of analyticsData) {
    let timeKey: Date;
    if (timePeriod === "24h") {
      timeKey = roundToNearestHour(record.clickedAt);
    } else if (timePeriod === "7d" || timePeriod === "30d") {
      timeKey = roundToNearestDate(record.clickedAt);
    } else {
      // For 3m, 12m, and all, round to the start of the month
      timeKey = new Date(
        record.clickedAt.getFullYear(),
        record.clickedAt.getMonth(),
        1,
      );
    }
    const timeKeyStr = timeKey.toISOString();

    aggregationMaps.clicksOverTime.set(
      timeKeyStr,
      (aggregationMaps.clicksOverTime.get(timeKeyStr) ?? 0) + record._count,
    );

    const cityKey = `${record.city ?? "Unknown"}|${record.country ?? "Unknown"}`;
    const cityData = aggregationMaps.cities.get(cityKey) ?? {
      city: record.city ?? "Unknown",
      country: record.country ?? "Unknown",
      clicks: 0,
    };
    cityData.clicks += record._count;
    aggregationMaps.cities.set(cityKey, cityData);

    const updateMetric = (map: Map<string, number>, key: string) => {
      map.set(key, (map.get(key) ?? 0) + record._count);
    };

    updateMetric(aggregationMaps.countries, record.country ?? "Unknown");
    updateMetric(aggregationMaps.continents, record.continent ?? "Unknown");
    updateMetric(aggregationMaps.devices, record.device ?? "Unknown");
    updateMetric(aggregationMaps.browsers, record.browser ?? "Unknown");
    updateMetric(aggregationMaps.oses, record.os ?? "Unknown");
    updateMetric(aggregationMaps.referrers, record.referer ?? "Unknown");
  }

  return aggregationMaps;
}

/**
 * Formats the aggregated analytics data into the AnalyticsResponse structure.
 */
export function formatAnalyticsResponse(
  aggregationMaps: ReturnType<typeof processAnalyticsData>,
  links: Array<{ id: string; slug: string; url: string }>,
  linkClicksMap: Map<string, number>,
): AnalyticsResponse {
  const totalClicks = Array.from(
    aggregationMaps.clicksOverTime.values(),
  ).reduce((sum, clicks) => sum + clicks, 0);

  return {
    totalClicks,
    clicksOverTime: Array.from(aggregationMaps.clicksOverTime.entries())
      .map(([time, clicks]) => ({
        time: new Date(time),
        clicks,
      }))
      .sort((a, b) => a.time.getTime() - b.time.getTime()),
    links: links.map((link) => ({
      slug: link.slug,
      url: link.url,
      clicks: linkClicksMap.get(link.id) ?? 0,
    })),
    cities: Array.from(aggregationMaps.cities.values()),
    countries: Array.from(aggregationMaps.countries.entries()).map(
      ([country, clicks]) => ({ country, clicks }),
    ),
    continents: Array.from(aggregationMaps.continents.entries()).map(
      ([continent, clicks]) => ({ continent, clicks }),
    ),
    devices: Array.from(aggregationMaps.devices.entries()).map(
      ([device, clicks]) => ({ device, clicks }),
    ),
    browsers: Array.from(aggregationMaps.browsers.entries()).map(
      ([browser, clicks]) => ({ browser, clicks }),
    ),
    oses: Array.from(aggregationMaps.oses.entries()).map(([os, clicks]) => ({
      os,
      clicks,
    })),
    referrers: Array.from(aggregationMaps.referrers.entries()).map(
      ([referrer, clicks]) => ({ referrer, clicks }),
    ),
  };
}
