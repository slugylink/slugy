"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAnalytics } from "@/hooks/use-analytics";
import FilterActions, {
  type CategoryId,
  type FilterCategory,
} from "@/components/web/_analytics/filter";
import {
  Box,
  Chrome,
  Flag,
  LinkIcon,
  Map,
  MapPinned,
  Smartphone,
  Share2,
  Redo2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface AnalyticsClientProps {
  workspace: string;
}

type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

type FilterKey =
  | "slug_key"
  | "country_key"
  | "city_key"
  | "continent_key"
  | "browser_key"
  | "os_key"
  | "device_key"
  | "referrer_key"
  | "destination_key"
  | "domain_key";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIME_PERIOD: TimePeriod = "24h";

const VALID_TIME_PERIODS: readonly TimePeriod[] = [
  "24h",
  "7d",
  "30d",
  "3m",
  "12m",
  "all",
] as const;

const VALID_FILTER_KEYS: readonly FilterKey[] = [
  "slug_key",
  "country_key",
  "city_key",
  "continent_key",
  "browser_key",
  "os_key",
  "device_key",
  "referrer_key",
  "destination_key",
  "domain_key",
] as const;

const ANALYTICS_METRICS = [
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

const ICON_PROPS = {
  className: "h-4 w-4",
  strokeWidth: 1.3,
} as const;

// ============================================================================
// Dynamic Imports
// ============================================================================

const CardSkeleton = () => (
  <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />
);

const Chart = dynamic(() => import("@/components/web/_analytics/chart"), {
  ssr: true,
});

const UrlClicks = dynamic(
  () => import("@/components/web/_analytics/urlclicks-card"),
  {
    ssr: true,
    loading: CardSkeleton,
  },
);

const GeoClicks = dynamic(
  () => import("@/components/web/_analytics/geoclicks-card"),
  {
    ssr: true,
    loading: CardSkeleton,
  },
);

const DeviceClicks = dynamic(
  () => import("@/components/web/_analytics/deviceclicks-card"),
  {
    ssr: false,
    loading: CardSkeleton,
  },
);

const ReferrerClicks = dynamic(
  () => import("@/components/web/_analytics/referrerclicks-card"),
  {
    ssr: false,
    loading: CardSkeleton,
  },
);

// ============================================================================
// Utilities
// ============================================================================

function isValidTimePeriod(period: string | null): period is TimePeriod {
  return Boolean(period && VALID_TIME_PERIODS.includes(period as TimePeriod));
}

function extractFilterParams(
  searchParams: URLSearchParams,
): Record<string, string> {
  const params: Record<string, string> = {};

  VALID_FILTER_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      params[key] = value;
    }
  });

  return params;
}

function normalizeChartData(clicksOverTime: any[] | undefined) {
  return clicksOverTime?.map((item) => ({
    time: item.time instanceof Date ? item.time.toISOString() : item.time,
    clicks: item.clicks,
  }));
}

// ============================================================================
// Filter Categories Builder
// ============================================================================

function buildFilterCategories(data: {
  links: any[];
  countries: any[];
  cities: any[];
  continents: any[];
  browsers: any[];
  oses: any[];
  devices: any[];
  referrers: any[];
  destinations: any[];
}): FilterCategory[] {
  return [
    {
      id: "slug_key" as CategoryId,
      label: "Link",
      icon: <LinkIcon {...ICON_PROPS} />,
      options: data.links || [],
    },
    {
      id: "country_key" as CategoryId,
      label: "Country",
      icon: <Flag {...ICON_PROPS} />,
      options: data.countries || [],
    },
    {
      id: "city_key" as CategoryId,
      label: "City",
      icon: <MapPinned {...ICON_PROPS} />,
      options: data.cities || [],
    },
    {
      id: "continent_key" as CategoryId,
      label: "Continent",
      icon: <Map {...ICON_PROPS} />,
      options: data.continents || [],
    },
    {
      id: "browser_key" as CategoryId,
      label: "Browser",
      icon: <Chrome {...ICON_PROPS} />,
      options: data.browsers || [],
    },
    {
      id: "os_key" as CategoryId,
      label: "OS",
      icon: <Box {...ICON_PROPS} />,
      options: data.oses || [],
    },
    {
      id: "device_key" as CategoryId,
      label: "Device",
      icon: <Smartphone {...ICON_PROPS} />,
      options: data.devices || [],
    },
    {
      id: "referrer_key" as CategoryId,
      label: "Referrer",
      icon: <Share2 {...ICON_PROPS} />,
      options: data.referrers || [],
    },
    {
      id: "destination_key" as CategoryId,
      label: "Destination URL",
      icon: <Redo2 {...ICON_PROPS} />,
      options: data.destinations || [],
    },
  ];
}

// ============================================================================
// Error State Component
// ============================================================================

function AnalyticsUnavailableBanner({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="bg-muted/40 mb-4 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">Analytics temporarily unavailable</p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {message ||
            "There was an error loading your analytics. Please try again later."}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="border-input bg-background hover:bg-muted inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-3 text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const AnalyticsClient = memo(function AnalyticsClient({
  workspace,
}: AnalyticsClientProps) {
  const searchParams = useSearchParams();

  // Extract and validate time period
  const timePeriod = useMemo(() => {
    const period = searchParams.get("time_period");
    return isValidTimePeriod(period) ? period : DEFAULT_TIME_PERIOD;
  }, [searchParams]);

  // Extract filter parameters (excluding time_period)
  const filterParams = useMemo(
    () => extractFilterParams(searchParams),
    [searchParams],
  );

  // Fetch analytics data
  const {
    data: res,
    links,
    countries,
    cities,
    continents,
    browsers,
    oses,
    devices,
    referrers,
    destinations,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useAnalytics({
    workspaceslug: workspace,
    timePeriod,
    searchParams: filterParams,
    metrics: ANALYTICS_METRICS,
  });

  // Normalize filter options
  const filterData = useMemo(
    () => ({
      links: (links || []).map((item: any) => ({
        slug: item.slug,
        url: item.url,
        domain: item.domain,
        clicks: item.clicks,
      })),
      countries: (countries || []).map((item: any) => ({
        country: item.country,
        clicks: item.clicks,
      })),
      cities: (cities || []).map((item: any) => ({
        city: item.city,
        country: item.country,
        clicks: item.clicks,
      })),
      continents: (continents || []).map((item: any) => ({
        continent: item.continent,
        clicks: item.clicks,
      })),
      browsers: (browsers || []).map((item: any) => ({
        browser: item.browser,
        clicks: item.clicks,
      })),
      oses: (oses || []).map((item: any) => ({
        os: item.os,
        clicks: item.clicks,
      })),
      devices: (devices || []).map((item: any) => ({
        device: item.device,
        clicks: item.clicks,
      })),
      referrers: (referrers || []).map((item: any) => ({
        referrer: item.referrer,
        clicks: item.clicks,
      })),
      destinations: (destinations || []).map((item: any) => ({
        destination: item.destination,
        clicks: item.clicks,
      })),
    }),
    [
      links,
      countries,
      cities,
      continents,
      browsers,
      oses,
      devices,
      referrers,
      destinations,
    ],
  );

  // Build filter categories
  const filterCategories = useMemo(
    () => buildFilterCategories(filterData),
    [filterData],
  );

  // Normalize chart data
  const chartData = useMemo(
    () => normalizeChartData(res?.clicksOverTime),
    [res?.clicksOverTime],
  );

  const hasResolvedData = Boolean(res);
  const showInitialLoadingState = isLoading && !hasResolvedData && !error;
  const chartRefreshing = isValidating && hasResolvedData;

  // Shared props for all card components — omit error so cards keep their shells
  const sharedProps = useMemo(
    () => ({
      workspaceslug: workspace,
      searchParams: filterParams,
      timePeriod,
      isLoading: showInitialLoadingState,
      error: undefined as Error | undefined,
    }),
    [workspace, filterParams, timePeriod, showInitialLoadingState],
  );

  return (
    <section>
      {/* Filter Actions */}
      <div className="flex items-center justify-start">
        <FilterActions filterCategories={filterCategories} />
      </div>

      <div className="my-6 space-y-4">
        {error && (
          <AnalyticsUnavailableBanner
            message={error.message}
            onRetry={() => {
              void mutate();
            }}
          />
        )}

        {/* Analytics Chart */}
        <Chart
          {...sharedProps}
          data={chartData}
          totalClicks={res?.totalClicks ?? 0}
          isRefreshing={chartRefreshing}
          error={error ?? undefined}
        />

        {/* Analytics Cards Grid */}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <UrlClicks
            {...sharedProps}
            linksData={filterData.links}
            destinationsData={filterData.destinations}
          />

          <GeoClicks
            {...sharedProps}
            citiesData={filterData.cities}
            countriesData={filterData.countries}
            continentsData={filterData.continents}
          />

          <DeviceClicks
            {...sharedProps}
            devicesData={filterData.devices}
            browsersData={filterData.browsers}
            osesData={filterData.oses}
          />

          <ReferrerClicks
            {...sharedProps}
            referrersData={filterData.referrers}
          />
        </div>
      </div>
    </section>
  );
});
