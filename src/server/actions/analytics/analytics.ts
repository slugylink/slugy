import { sub, type Duration } from "date-fns";

// Supported analytics time periods
type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

// Supported analytics metrics
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

const METRIC_FLAGS = {
  totalClicks: 1 << 0,
  clicksOverTime: 1 << 1,
  links: 1 << 2,
  cities: 1 << 3,
  countries: 1 << 4,
  continents: 1 << 5,
  devices: 1 << 6,
  browsers: 1 << 7,
  oses: 1 << 8,
  referrers: 1 << 9,
  destinations: 1 << 10,
} as const satisfies Record<AnalyticsMetric, number>;

type MetricFlags = number;

// Analytics data for a single link
interface LinkAnalytics {
  slug: string;
  url: string;
  clicks: number;
}

// Full analytics response structure (all fields optional for partial responses)
interface AnalyticsResponse {
  totalClicks?: number;
  clicksOverTime?: Array<{ time: Date; clicks: number }>;
  links?: LinkAnalytics[];
  cities?: Array<{ city: string; country: string; clicks: number }>;
  countries?: Array<{ country: string; clicks: number }>;
  continents?: Array<{ continent: string; clicks: number }>;
  devices?: Array<{ device: string; clicks: number }>;
  browsers?: Array<{ browser: string; clicks: number }>;
  oses?: Array<{ os: string; clicks: number }>;
  referrers?: Array<{ referrer: string; clicks: number }>;
  destinations?: Array<{ destination: string; clicks: number }>;
}

// Base properties for analytics queries
interface BaseAnalyticsProps {
  timePeriod: TimePeriod;
  slug_key?: string | null;
  country_key?: string | null;
  city_key?: string | null;
  continent_key?: string | null;
  browser_key?: string | null;
  os_key?: string | null;
  referrer_key?: string | null;
  device_key?: string | null;
  destination_key?: string | null;
}

// Extended props for analytics request
interface AnalyticsRequestProps extends BaseAnalyticsProps {
  workspaceslug: string;
  metrics?: AnalyticsMetric[];
}

// Aggregation maps type for metrics
interface AggregationMaps {
  totalClicks?: number;
  clicksOverTime?: Map<string, number>;
  cities?: Map<string, { city: string; country: string; clicks: number }>;
  countries?: Map<string, number>;
  continents?: Map<string, number>;
  devices?: Map<string, number>;
  browsers?: Map<string, number>;
  oses?: Map<string, number>;
  referrers?: Map<string, number>;
  destinations?: Map<string, number>;
}

// Time period durations for analytics queries (except 'all')
const PERIODS: Record<Exclude<TimePeriod, "all">, Duration> = {
  "24h": { hours: 24 },
  "7d": { days: 7 },
  "30d": { days: 30 },
  "3m": { months: 3 },
  "12m": { months: 12 },
};

function getMetricFlags(metrics: AnalyticsMetric[]): MetricFlags {
  let flags = 0;

  for (const metric of metrics) {
    flags |= METRIC_FLAGS[metric];
  }

  return flags;
}

function hasMetric(flags: MetricFlags, metric: AnalyticsMetric): boolean {
  return (flags & METRIC_FLAGS[metric]) !== 0;
}

function roundToNearestHour(date: Date): Date {
  const rounded = new Date(date);
  rounded.setMinutes(0, 0, 0);
  return rounded;
}

function roundToNearestDate(date: Date): Date {
  const rounded = new Date(date);
  rounded.setHours(0, 0, 0, 0);
  return rounded;
}

function getStartDate(timePeriod: TimePeriod): Date {
  if (timePeriod === "all") return new Date(0);
  const now = new Date();
  return sub(now, PERIODS[timePeriod]);
}

/**
 * Aggregates analytics data into various metrics/maps for response formatting.
 * Only aggregates requested metrics for performance.
 */
function processAnalyticsData(
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
  links: Array<{ id: string; slug: string; url: string }>,
  metrics: AnalyticsMetric[],
): AggregationMaps {
  const metricFlags = getMetricFlags(metrics);
  const linkIdToUrl = new Map(links.map((link) => [link.id, link.url]));
  // Only initialize maps for requested metrics
  const aggregationMaps: AggregationMaps = {};
  if (hasMetric(metricFlags, "totalClicks")) aggregationMaps.totalClicks = 0;
  if (hasMetric(metricFlags, "clicksOverTime")) {
    aggregationMaps.clicksOverTime = new Map<string, number>();
  }
  if (hasMetric(metricFlags, "cities")) {
    aggregationMaps.cities = new Map<
      string,
      { city: string; country: string; clicks: number }
    >();
  }
  if (hasMetric(metricFlags, "countries")) {
    aggregationMaps.countries = new Map<string, number>();
  }
  if (hasMetric(metricFlags, "continents")) {
    aggregationMaps.continents = new Map<string, number>();
  }
  if (hasMetric(metricFlags, "devices")) {
    aggregationMaps.devices = new Map<string, number>();
  }
  if (hasMetric(metricFlags, "browsers")) {
    aggregationMaps.browsers = new Map<string, number>();
  }
  if (hasMetric(metricFlags, "oses")) {
    aggregationMaps.oses = new Map<string, number>();
  }
  if (hasMetric(metricFlags, "referrers")) {
    aggregationMaps.referrers = new Map<string, number>();
  }
  if (hasMetric(metricFlags, "destinations")) {
    aggregationMaps.destinations = new Map<string, number>();
  }

  for (const record of analyticsData) {
    if (aggregationMaps.totalClicks !== undefined) {
      aggregationMaps.totalClicks += record._count;
    }

    if (aggregationMaps.clicksOverTime) {
      let timeKey: Date;
      if (timePeriod === "24h") {
        timeKey = roundToNearestHour(record.clickedAt);
      } else if (timePeriod === "7d" || timePeriod === "30d") {
        timeKey = roundToNearestDate(record.clickedAt);
      } else {
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
    }
    if (aggregationMaps.cities) {
      const cityKey = `${record.city ?? "Unknown"}|${record.country ?? "Unknown"}`;
      const cityData = aggregationMaps.cities.get(cityKey) ?? {
        city: record.city ?? "Unknown",
        country: record.country ?? "Unknown",
        clicks: 0,
      };
      cityData.clicks += record._count;
      aggregationMaps.cities.set(cityKey, cityData);
    }
    const updateMetric = (
      map: Map<string, number> | undefined,
      key: string,
    ) => {
      if (map) map.set(key, (map.get(key) ?? 0) + record._count);
    };
    updateMetric(aggregationMaps.countries, record.country ?? "Unknown");
    updateMetric(aggregationMaps.continents, record.continent ?? "Unknown");
    updateMetric(aggregationMaps.devices, record.device ?? "Unknown");
    updateMetric(aggregationMaps.browsers, record.browser ?? "Unknown");
    updateMetric(aggregationMaps.oses, record.os ?? "Unknown");
    updateMetric(aggregationMaps.referrers, record.referer ?? "Unknown");

    if (aggregationMaps.destinations) {
      const url = linkIdToUrl.get(record.linkId) ?? "Unknown";
      updateMetric(aggregationMaps.destinations, url);
    }
  }
  return aggregationMaps;
}

/**
 * Formats the aggregated analytics data into the AnalyticsResponse structure.
 * Only includes requested metrics for performance.
 */
function formatAnalyticsResponse(
  aggregationMaps: AggregationMaps,
  links: Array<{ id: string; slug: string; url: string }>,
  linkClicksMap: Map<string, number>,
  metrics: AnalyticsMetric[],
): AnalyticsResponse {
  const metricFlags = getMetricFlags(metrics);
  const response: AnalyticsResponse = {};

  if (hasMetric(metricFlags, "totalClicks")) {
    response.totalClicks = aggregationMaps.totalClicks ?? 0;
  }

  if (
    hasMetric(metricFlags, "clicksOverTime") &&
    aggregationMaps.clicksOverTime
  ) {
    response.clicksOverTime = Array.from(
      aggregationMaps.clicksOverTime.entries(),
    )
      .map(([time, clicks]: [string, number]) => ({
        time: new Date(time),
        clicks,
      }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  if (hasMetric(metricFlags, "links")) {
    response.links = links.map((link) => ({
      slug: link.slug,
      url: link.url,
      clicks: linkClicksMap.get(link.id) ?? 0,
    }));
  }

  if (hasMetric(metricFlags, "cities") && aggregationMaps.cities) {
    response.cities = Array.from(aggregationMaps.cities.values());
  }

  if (hasMetric(metricFlags, "countries") && aggregationMaps.countries) {
    response.countries = Array.from(aggregationMaps.countries.entries()).map(
      ([country, clicks]: [string, number]) => ({ country, clicks }),
    );
  }

  if (hasMetric(metricFlags, "continents") && aggregationMaps.continents) {
    response.continents = Array.from(aggregationMaps.continents.entries()).map(
      ([continent, clicks]: [string, number]) => ({ continent, clicks }),
    );
  }

  if (hasMetric(metricFlags, "devices") && aggregationMaps.devices) {
    response.devices = Array.from(aggregationMaps.devices.entries()).map(
      ([device, clicks]: [string, number]) => ({ device, clicks }),
    );
  }

  if (hasMetric(metricFlags, "browsers") && aggregationMaps.browsers) {
    response.browsers = Array.from(aggregationMaps.browsers.entries()).map(
      ([browser, clicks]: [string, number]) => ({ browser, clicks }),
    );
  }

  if (hasMetric(metricFlags, "oses") && aggregationMaps.oses) {
    response.oses = Array.from(aggregationMaps.oses.entries()).map(
      ([os, clicks]: [string, number]) => ({ os, clicks }),
    );
  }

  if (hasMetric(metricFlags, "referrers") && aggregationMaps.referrers) {
    response.referrers = Array.from(aggregationMaps.referrers.entries()).map(
      ([referrer, clicks]: [string, number]) => ({ referrer, clicks }),
    );
  }

  if (hasMetric(metricFlags, "destinations") && aggregationMaps.destinations) {
    response.destinations = Array.from(
      aggregationMaps.destinations.entries(),
    ).map(([destination, clicks]: [string, number]) => ({
      destination,
      clicks,
    }));
  }
  return response;
}

export type {
  TimePeriod,
  AnalyticsMetric,
  AnalyticsResponse,
  LinkAnalytics,
  BaseAnalyticsProps,
  AnalyticsRequestProps,
};
export {
  PERIODS,
  roundToNearestHour,
  roundToNearestDate,
  getStartDate,
  getMetricFlags,
  processAnalyticsData,
  formatAnalyticsResponse,
};
