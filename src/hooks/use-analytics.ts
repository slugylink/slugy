import useSWR from "swr";
import { useMemo, useCallback } from "react";
import { useDebounce } from "./use-debounce";

export type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

export interface AnalyticsData {
  totalClicks: number;
  clicksOverTime: Array<{ time: Date; clicks: number }>;
  links: Array<{ slug: string; url: string; clicks: number }>;
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
  metrics?: Array<keyof AnalyticsData>; // Allow selective metric fetching
  useTinybird?: boolean; // New option to use Tinybird endpoint
}

// Constants for better maintainability
const DEBOUNCE_DELAY = 500;
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

// Type for metric mapping
type MetricMapping = {
  [K in keyof AnalyticsData]: {
    key: K;
    fallback: AnalyticsData[K];
  };
};

// Metric mapping configuration
const METRIC_MAPPING: MetricMapping = {
  totalClicks: { key: "totalClicks", fallback: 0 },
  clicksOverTime: { key: "clicksOverTime", fallback: [] },
  links: { key: "links", fallback: [] },
  cities: { key: "cities", fallback: [] },
  countries: { key: "countries", fallback: [] },
  continents: { key: "continents", fallback: [] },
  devices: { key: "devices", fallback: [] },
  browsers: { key: "browsers", fallback: [] },
  oses: { key: "oses", fallback: [] },
  referrers: { key: "referrers", fallback: [] },
  destinations: { key: "destinations", fallback: [] },
};

const fetchAnalyticsData = async (
  workspaceslug: string,
  params: Record<string, string>,
  metrics?: Array<keyof AnalyticsData>,
  useTinybird: boolean = true,
): Promise<Partial<AnalyticsData>> => {
  try {
    const searchParams = new URLSearchParams(params);

    // Add metrics parameter if specified
    if (metrics && metrics.length > 0) {
      searchParams.set("metrics", metrics.join(","));
    }
    const endpoint = useTinybird
      ? `/api/workspace/${workspaceslug}/analytics/tinybird`
      : `/api/workspace/${workspaceslug}/analytics`;

    // const endpoint = `/api/workspace/${workspaceslug}/analytics/tinybird`;

    const response = await fetch(`${endpoint}?${searchParams}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch analytics data: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
      );
    }

    const data = await response.json();

    if (metrics && metrics.length > 0) {
      const result: Partial<AnalyticsData> = {};

      metrics.forEach((metric) => {
        const mapping = METRIC_MAPPING[metric];
        if (mapping) {
          result[metric] = data[mapping.key] ?? mapping.fallback;
        }
      });

      return result;
    }

    // Return all metrics if none specified (backward compatibility)
    return {
      totalClicks: data.totalClicks ?? 0,
      clicksOverTime: data.clicksOverTime ?? [],
      links: data.links ?? [],
      cities: data.cities ?? [],
      countries: data.countries ?? [],
      continents: data.continents ?? [],
      devices: data.devices ?? [],
      browsers: data.browsers ?? [],
      oses: data.oses ?? [],
      referrers: data.referrers ?? [],
      destinations: data.destinations ?? [],
    };
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    throw error;
  }
};

// Helper function to sort data by clicks
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

  // Debounce the search params to prevent excessive API calls while filtering
  const debouncedSearchParams = useDebounce(stableSearchParams, DEBOUNCE_DELAY);

  // Only fetch when enabled and we have a workspace slug
  const shouldFetch = enabled && Boolean(workspaceslug?.trim());

  // Create stable SWR key
  const swrKey = useMemo(() => {
    if (!shouldFetch) return null;

    return [
      useTinybird ? "analytics-tinybird" : "analytics",
      metrics?.join(",") || "all",
      workspaceslug,
      debouncedSearchParams,
    ];
  }, [shouldFetch, metrics, workspaceslug, debouncedSearchParams, useTinybird]);

  // Fetch data with better error handling
  const { data, error, isLoading, mutate, isValidating } = useSWR<
    Partial<AnalyticsData>,
    Error
  >(
    swrKey,
    () =>
      fetchAnalyticsData(
        workspaceslug,
        debouncedSearchParams,
        metrics,
        useTinybird,
      ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000, // 5 seconds
    },
  );

  // Memoized sorted data for each metric type with better performance
  const sortedData = useMemo(() => {
    if (!data) return {};

    const result: Record<
      string,
      Array<{ clicks: number; [key: string]: unknown }>
    > = {};

    // Use the helper function for consistent sorting
    if (data.links) result.links = sortByClicks(data.links);
    if (data.cities) result.cities = sortByClicks(data.cities);
    if (data.countries) result.countries = sortByClicks(data.countries);
    if (data.continents) result.continents = sortByClicks(data.continents);
    if (data.devices) result.devices = sortByClicks(data.devices);
    if (data.browsers) result.browsers = sortByClicks(data.browsers);
    if (data.oses) result.oses = sortByClicks(data.oses);
    if (data.referrers) result.referrers = sortByClicks(data.referrers);
    if (data.destinations)
      result.destinations = sortByClicks(data.destinations);

    return result;
  }, [data]);

  // Memoized convenience getters for better performance
  const convenienceGetters = useMemo(
    () => ({
      totalClicks: data?.totalClicks ?? 0,
      clicksOverTime: data?.clicksOverTime ?? [],
      links: sortedData.links ?? [],
      cities: sortedData.cities ?? [],
      countries: sortedData.countries ?? [],
      continents: sortedData.continents ?? [],
      devices: sortedData.devices ?? [],
      browsers: sortedData.browsers ?? [],
      oses: sortedData.oses ?? [],
      referrers: sortedData.referrers ?? [],
      destinations: sortedData.destinations ?? [],
    }),
    [data, sortedData],
  );

  // Memoized refresh function
  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  return {
    // Raw data
    data,
    sortedData,

    // Loading states
    isLoading,
    isValidating,

    // Error handling
    error,

    // Actions
    mutate,
    refresh,

    // Convenience getters (with fallbacks)
    ...convenienceGetters,
  };
}
