import useSWR from "swr";
import { useMemo } from "react";

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
}

// Function to fetch analytics data with selective metrics
const fetchAnalyticsData = async (
  workspaceslug: string,
  params: Record<string, string>,
  metrics?: Array<keyof AnalyticsData>,
): Promise<Partial<AnalyticsData>> => {
  const searchParams = new URLSearchParams(params);

  // Add metrics parameter if specified
  if (metrics && metrics.length > 0) {
    searchParams.set("metrics", metrics.join(","));
  }

  const response = await fetch(
    `/api/workspace/${workspaceslug}/analytics?${searchParams}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch analytics data: ${response.statusText}`);
  }

  const data = await response.json();

  // Return only the requested metrics with fallbacks
  if (metrics && metrics.length > 0) {
    const result: Partial<AnalyticsData> = {};
    metrics.forEach((metric) => {
      switch (metric) {
        case "totalClicks":
          result.totalClicks = data.totalClicks ?? 0;
          break;
        case "clicksOverTime":
          result.clicksOverTime = data.clicksOverTime ?? [];
          break;
        case "links":
          result.links = data.links ?? [];
          break;
        case "cities":
          result.cities = data.cities ?? [];
          break;
        case "countries":
          result.countries = data.countries ?? [];
          break;
        case "continents":
          result.continents = data.continents ?? [];
          break;
        case "devices":
          result.devices = data.devices ?? [];
          break;
        case "browsers":
          result.browsers = data.browsers ?? [];
          break;
        case "oses":
          result.oses = data.oses ?? [];
          break;
        case "referrers":
          result.referrers = data.referrers ?? [];
          break;
        case "destinations":
          result.destinations = data.destinations ?? [];
          break;
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
};

export function useAnalytics({
  workspaceslug,
  timePeriod,
  searchParams = {},
  enabled = true,
  metrics,
}: UseAnalyticsParams) {
  // Create a stable search params object
  const stableSearchParams = useMemo(() => {
    const params = { time_period: timePeriod, ...searchParams };
    // Remove undefined and null values
    return Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value != null),
    );
  }, [timePeriod, searchParams]);

  // Only fetch when enabled and we have a workspace slug
  const shouldFetch = enabled && Boolean(workspaceslug);
  const swrKey = shouldFetch
    ? [
        "analytics",
        metrics?.join(",") || "all",
        workspaceslug,
        stableSearchParams,
      ]
    : null;

  const { data, error, isLoading, mutate } = useSWR<
    Partial<AnalyticsData>,
    Error
  >(
    swrKey,
    () => fetchAnalyticsData(workspaceslug, stableSearchParams, metrics),
    {
      keepPreviousData: true,
      dedupingInterval: 30000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    },
  );

  // Memoized sorted data for each metric type
  const sortedData = useMemo(() => {
    if (!data) return {};

    const result: Record<
      string,
      Array<{ clicks: number; [key: string]: unknown }>
    > = {};

    if (data.links) {
      result.links = [...data.links].sort((a, b) => b.clicks - a.clicks);
    }
    if (data.cities) {
      result.cities = [...data.cities].sort((a, b) => b.clicks - a.clicks);
    }
    if (data.countries) {
      result.countries = [...data.countries].sort(
        (a, b) => b.clicks - a.clicks,
      );
    }
    if (data.continents) {
      result.continents = [...data.continents].sort(
        (a, b) => b.clicks - a.clicks,
      );
    }
    if (data.devices) {
      result.devices = [...data.devices].sort((a, b) => b.clicks - a.clicks);
    }
    if (data.browsers) {
      result.browsers = [...data.browsers].sort((a, b) => b.clicks - a.clicks);
    }
    if (data.oses) {
      result.oses = [...data.oses].sort((a, b) => b.clicks - a.clicks);
    }
    if (data.referrers) {
      result.referrers = [...data.referrers].sort(
        (a, b) => b.clicks - a.clicks,
      );
    }
    if (data.destinations) {
      result.destinations = [...data.destinations].sort(
        (a, b) => b.clicks - a.clicks,
      );
    }

    return result;
  }, [data]);

  return {
    data,
    sortedData,
    error,
    isLoading,
    mutate,
    // Convenience getters for specific metrics (with fallbacks)
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
  };
}
