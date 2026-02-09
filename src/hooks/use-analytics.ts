import useSWR from "swr";
import { useMemo } from "react";
import { useDebounce } from "./use-debounce";

export type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

export interface AnalyticsData {
  totalClicks: number;
  clicksOverTime: Array<{ time: Date; clicks: number }>;
  links: Array<{ slug: string; url: string; domain: string; clicks: number }>;
  cities: Array<{ city: string; country: string; clicks: number }>;
  countries: Array<{ country: string; clicks: number }>;
  continents: Array<{ continent: string; clicks: number }>;
  devices: Array<{ device: string; clicks: number }>;
  browsers: Array<{ browser: string; clicks: number }>;
  oses: Array<{ os: string; clicks: number }>;
  referrers: Array<{ referrer: string; clicks: number }>;
  destinations: Array<{ destination: string; clicks: number }>;
}

interface UseAnalyticsParams {
  workspaceslug: string;
  timePeriod: TimePeriod;
  searchParams?: Record<string, string>;
  enabled?: boolean;
  metrics?: readonly (keyof AnalyticsData)[];
  useTinybird?: boolean;
}

// Constants
const DEFAULT_TIME_PERIOD: TimePeriod = "24h";
const DEBOUNCE_DELAY = 500;
const SWR_DEDUPING_INTERVAL = 5000;
const SWR_ERROR_RETRY_COUNT = 2;
const SWR_ERROR_RETRY_INTERVAL = 3000;

const DEFAULT_METRICS: Array<keyof AnalyticsData> = [
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

// Metric fallback values
const METRIC_FALLBACKS: Record<
  keyof AnalyticsData,
  AnalyticsData[keyof AnalyticsData]
> = {
  totalClicks: 0,
  clicksOverTime: [],
  links: [],
  cities: [],
  countries: [],
  continents: [],
  devices: [],
  browsers: [],
  oses: [],
  referrers: [],
  destinations: [],
};

// Metrics that can be sorted by clicks
const SORTABLE_METRICS: Array<keyof AnalyticsData> = [
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

/**
 * Check if the provided metrics array matches the default metrics
 * Used to avoid sending redundant metrics parameter to API
 */
const areMetricsDefault = (metrics: Array<keyof AnalyticsData>): boolean => {
  if (metrics.length !== DEFAULT_METRICS.length) return false;
  const sorted = [...metrics].sort();
  const defaultSorted = [...DEFAULT_METRICS].sort();
  return sorted.every((metric, index) => metric === defaultSorted[index]);
};

/**
 * Fetch analytics data from API with optimized parameter handling
 * Only sends non-default values to reduce URL size and improve performance
 * - Skips time_period if "24h" (default)
 * - Skips metrics if requesting all defaults
 * - Skips empty filter parameters
 */
const fetchAnalyticsData = async (
  workspaceslug: string,
  params: Record<string, string>,
  metrics?: Array<keyof AnalyticsData>,
  useTinybird: boolean = true,
): Promise<Partial<AnalyticsData>> => {
  const searchParams = new URLSearchParams();

  // Only add non-default/non-empty parameters
  Object.entries(params).forEach(([key, value]) => {
    // Skip time_period if it's the default "24h"
    if (key === "time_period" && value === "24h") return;

    // Skip empty/null values
    if (value && value.trim()) {
      searchParams.set(key, value);
    }
  });

  // Only send metrics if not requesting all default metrics
  if (metrics?.length && !areMetricsDefault(metrics)) {
    searchParams.set("metrics", metrics.join(","));
  }

  const endpoint = useTinybird
    ? `/api/workspace/${workspaceslug}/analytics/tinybird`
    : `/api/workspace/${workspaceslug}/analytics`;

  const queryString = searchParams.toString();
  const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch analytics data: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
    );
  }

  const data = await response.json();

  if (metrics?.length) {
    const result: Partial<AnalyticsData> = {};
    for (const metric of metrics) {
      result[metric] = data[metric] ?? METRIC_FALLBACKS[metric];
    }
    return result;
  }

  // Return all metrics with fallbacks
  return {
    totalClicks: data.totalClicks ?? METRIC_FALLBACKS.totalClicks,
    clicksOverTime: data.clicksOverTime ?? METRIC_FALLBACKS.clicksOverTime,
    links: data.links ?? METRIC_FALLBACKS.links,
    cities: data.cities ?? METRIC_FALLBACKS.cities,
    countries: data.countries ?? METRIC_FALLBACKS.countries,
    continents: data.continents ?? METRIC_FALLBACKS.continents,
    devices: data.devices ?? METRIC_FALLBACKS.devices,
    browsers: data.browsers ?? METRIC_FALLBACKS.browsers,
    oses: data.oses ?? METRIC_FALLBACKS.oses,
    referrers: data.referrers ?? METRIC_FALLBACKS.referrers,
    destinations: data.destinations ?? METRIC_FALLBACKS.destinations,
  };
};

const sortByClicks = <T extends { clicks: number }>(data: T[]): T[] => {
  return [...data].sort((a, b) => b.clicks - a.clicks);
};

export function useAnalytics({
  workspaceslug,
  timePeriod,
  searchParams = {},
  enabled = true,
  metrics = DEFAULT_METRICS,
  useTinybird = true,
}: UseAnalyticsParams) {
  const stableSearchParams = useMemo(() => {
    const params = { time_period: timePeriod, ...searchParams };
    return Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value != null && String(value).length > 0,
      ),
    );
  }, [timePeriod, searchParams]);

  const debouncedSearchParams = useDebounce(stableSearchParams, DEBOUNCE_DELAY);
  const shouldFetch = enabled && Boolean(workspaceslug?.trim());

  const swrKey = useMemo(() => {
    if (!shouldFetch) return null;
    // Serialize search params to ensure stable key
    const serializedParams = JSON.stringify(
      Object.keys(debouncedSearchParams)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = debouncedSearchParams[key];
            return acc;
          },
          {} as Record<string, string>,
        ),
    );
    // Sort metrics for consistent key generation
    const sortedMetrics = [...metrics].sort().join(",");
    return [
      useTinybird ? "analytics-tinybird" : "analytics",
      sortedMetrics,
      workspaceslug,
      serializedParams,
    ];
  }, [shouldFetch, metrics, workspaceslug, debouncedSearchParams, useTinybird]);

  const { data, error, isLoading, mutate, isValidating } = useSWR<
    Partial<AnalyticsData>,
    Error
  >(
    swrKey,
    () =>
      fetchAnalyticsData(
        workspaceslug,
        debouncedSearchParams,
        [...metrics],
        useTinybird,
      ),
    {
      dedupingInterval: SWR_DEDUPING_INTERVAL,
      errorRetryCount: SWR_ERROR_RETRY_COUNT,
      errorRetryInterval: SWR_ERROR_RETRY_INTERVAL,
    },
  );

  const sortedData = useMemo(() => {
    if (!data)
      return {} as Partial<
        Pick<AnalyticsData, (typeof SORTABLE_METRICS)[number]>
      >;

    const result: Partial<
      Pick<AnalyticsData, (typeof SORTABLE_METRICS)[number]>
    > = {};

    for (const metric of SORTABLE_METRICS) {
      const value = data[metric];
      if (Array.isArray(value) && value.length > 0) {
        (result as Record<string, unknown>)[metric] = sortByClicks(
          value as Array<{ clicks: number }>,
        );
      }
    }

    return result;
  }, [data]);

  const convenienceGetters = useMemo(
    () => ({
      totalClicks: data?.totalClicks ?? 0,
      clicksOverTime: data?.clicksOverTime ?? [],
      links: sortedData.links ?? data?.links ?? [],
      cities: sortedData.cities ?? data?.cities ?? [],
      countries: sortedData.countries ?? data?.countries ?? [],
      continents: sortedData.continents ?? data?.continents ?? [],
      devices: sortedData.devices ?? data?.devices ?? [],
      browsers: sortedData.browsers ?? data?.browsers ?? [],
      oses: sortedData.oses ?? data?.oses ?? [],
      referrers: sortedData.referrers ?? data?.referrers ?? [],
      destinations: sortedData.destinations ?? data?.destinations ?? [],
    }),
    [data, sortedData],
  );

  return {
    data,
    sortedData,
    isLoading,
    isValidating,
    error,
    mutate,
    refresh: mutate,
    ...convenienceGetters,
  };
}
