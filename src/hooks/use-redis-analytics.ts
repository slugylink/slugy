import useSWR from "swr";
import { useMemo } from "react";
import type { TimePeriod, AnalyticsData } from "./use-analytics";

type UseRedisAnalyticsParams = {
  workspaceslug: string;
  timePeriod: TimePeriod; // should be "24h"
  searchParams?: Record<string, string>;
  enabled?: boolean;
  metrics?: Array<keyof AnalyticsData>;
};

export function useRedisAnalytics({
  workspaceslug,
  timePeriod,
  searchParams = {},
  enabled = true,
  metrics,
}: UseRedisAnalyticsParams) {
  const query = useMemo(() => {
    const sp = new URLSearchParams({ time_period: timePeriod, ...searchParams });
    if (metrics && metrics.length > 0) sp.set("metrics", metrics.join(","));
    return `/api/workspace/${workspaceslug}/analytics/redis?${sp.toString()}`;
  }, [workspaceslug, timePeriod, searchParams, metrics]);

  const shouldFetch = enabled && workspaceslug && timePeriod === "24h";

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    Partial<AnalyticsData>,
    Error
  >(
    shouldFetch ? ["redis-analytics", query] : null,
    async () => {
      const res = await fetch(query);
      if (!res.ok) throw new Error(`Redis analytics failed: ${res.status}`);
      return (await res.json()) as Partial<AnalyticsData>;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 20_000,
    },
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    totalClicks: data?.totalClicks ?? 0,
    clicksOverTime: data?.clicksOverTime ?? [],
    links: data?.links ?? [],
    cities: data?.cities ?? [],
    countries: data?.countries ?? [],
    continents: data?.continents ?? [],
    devices: data?.devices ?? [],
    browsers: data?.browsers ?? [],
    oses: data?.oses ?? [],
    referrers: data?.referrers ?? [],
    destinations: data?.destinations ?? [],
  };
}


