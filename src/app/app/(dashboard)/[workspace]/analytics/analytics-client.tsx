"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
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

// Constants for better maintainability
const DEFAULT_TIME_PERIOD = "24h";
const CHART_HEIGHT = "h-[300px] sm:h-[420px]";

// Dynamic imports with optimized loading
const Chart = dynamic(() => import("@/components/web/_analytics/chart"), {
  ssr: true,
  loading: () => <ChartSkeleton />,
});

const UrlClicks = dynamic(
  () => import("@/components/web/_analytics/urlclicks-card"),
  {
    ssr: true,
    loading: () => <CardSkeleton />,
  },
);

const GeoClicks = dynamic(
  () => import("@/components/web/_analytics/geoclicks-card"),
  {
    ssr: true,
    loading: () => <CardSkeleton />,
  },
);

const DeviceClicks = dynamic(
  () => import("@/components/web/_analytics/deviceclicks-card"),
  {
    ssr: false,
    loading: () => <CardSkeleton />,
  },
);

const ReferrerClicks = dynamic(
  () => import("@/components/web/_analytics/referrerclicks-card"),
  {
    ssr: false,
    loading: () => <CardSkeleton />,
  },
);

// Loading skeleton components
function ChartSkeleton() {
  return (
    <div
      className={`${CHART_HEIGHT} bg-muted w-full animate-pulse rounded-lg`}
    />
  );
}

function CardSkeleton() {
  return <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />;
}

interface AnalyticsClientProps {
  workspace: string;
}

export function AnalyticsClient({ workspace }: AnalyticsClientProps) {
  const searchParams = useSearchParams();

  // Get time period with better type safety
  const timePeriod = useMemo(() => {
    const period = searchParams.get("time_period");
    const validPeriods = ["24h", "7d", "30d", "3m", "12m", "all"] as const;
    return validPeriods.includes(period as (typeof validPeriods)[number])
      ? (period as (typeof validPeriods)[number])
      : DEFAULT_TIME_PERIOD;
  }, [searchParams]);

  // Get all search params as an object with better memoization
  const searchParamsObj = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  // Use the analytics hook to fetch all data at once
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
  } = useAnalytics({
    workspaceslug: workspace,
    timePeriod,
    searchParams: searchParamsObj,
    // Fetch all metrics for the main analytics dashboard
    metrics: [
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
    ],
  });

  // Helper function to convert analytics data to FilterOption types with better performance
  const convertToFilterOptions = useMemo(() => {
    return {
      links:
        (links as Array<{ slug: string; url: string; clicks: number }>)?.map(
          (item) => ({
            slug: item.slug,
            url: item.url,
            clicks: item.clicks,
          }),
        ) || [],
      countries:
        (countries as Array<{ country: string; clicks: number }>)?.map(
          (item) => ({
            country: item.country,
            clicks: item.clicks,
          }),
        ) || [],
      cities:
        (
          cities as Array<{ city: string; country: string; clicks: number }>
        )?.map((item) => ({
          city: item.city,
          country: item.country,
          clicks: item.clicks,
        })) || [],
      continents:
        (continents as Array<{ continent: string; clicks: number }>)?.map(
          (item) => ({
            continent: item.continent,
            clicks: item.clicks,
          }),
        ) || [],
      browsers:
        (browsers as Array<{ browser: string; clicks: number }>)?.map(
          (item) => ({
            browser: item.browser,
            clicks: item.clicks,
          }),
        ) || [],
      oses:
        (oses as Array<{ os: string; clicks: number }>)?.map((item) => ({
          os: item.os,
          clicks: item.clicks,
        })) || [],
      devices:
        (devices as Array<{ device: string; clicks: number }>)?.map((item) => ({
          device: item.device,
          clicks: item.clicks,
        })) || [],
      referrers:
        (referrers as Array<{ referrer: string; clicks: number }>)?.map(
          (item) => ({
            referrer: item.referrer,
            clicks: item.clicks,
          }),
        ) || [],
      destinations:
        (destinations as Array<{ destination: string; clicks: number }>)?.map(
          (item) => ({
            destination: item.destination,
            clicks: item.clicks,
          }),
        ) || [],
    };
  }, [
    links,
    countries,
    cities,
    continents,
    browsers,
    oses,
    devices,
    referrers,
    destinations,
  ]);

  // Memoize filter categories to prevent unnecessary re-renders
  const filterCategories = useMemo(
    (): FilterCategory[] => [
      {
        id: "slug_key" as CategoryId,
        label: "Link",
        icon: <LinkIcon className="h-4 w-4" strokeWidth={1.3} />,
        options: convertToFilterOptions.links,
      },
      {
        id: "country_key" as CategoryId,
        label: "Country",
        icon: <Flag className="h-4 w-4" strokeWidth={1.3} />,
        options: convertToFilterOptions.countries,
      },
      {
        id: "city_key" as CategoryId,
        label: "City",
        icon: <MapPinned className="h-4 w-4" strokeWidth={1.3} />,
        options: convertToFilterOptions.cities,
      },
      {
        id: "continent_key" as CategoryId,
        label: "Continent",
        icon: <Map className="h-4 w-4" strokeWidth={1.3} />,
        options: convertToFilterOptions.continents,
      },
      {
        id: "browser_key" as CategoryId,
        label: "Browser",
        icon: <Chrome className="h-4 w-4" strokeWidth={1.3} />,
        options: convertToFilterOptions.browsers,
      },
      {
        id: "os_key" as CategoryId,
        label: "OS",
        icon: <Box className="h-4 w-4" strokeWidth={1.3} />,
        options: convertToFilterOptions.oses,
      },
      {
        id: "device_key" as CategoryId,
        label: "Device",
        icon: <Smartphone className="h-4 w-4" strokeWidth={1.3} />,
        options: convertToFilterOptions.devices,
      },
      {
        id: "referrer_key" as CategoryId,
        label: "Referrer",
        icon: <Share2 className="h-4 w-4" strokeWidth={1.3} />,
        options: convertToFilterOptions.referrers,
      },
      {
        id: "destination_key" as CategoryId,
        label: "Destination URL",
        icon: <Redo2 className="h-4 w-4" strokeWidth={1.3} />,
        options: convertToFilterOptions.destinations,
      },
    ],
    [convertToFilterOptions],
  );

  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    return res?.clicksOverTime?.map((item) => ({
      time: item.time instanceof Date ? item.time.toISOString() : item.time,
      clicks: item.clicks,
    }));
  }, [res?.clicksOverTime]);

  // Error state with better UX
  if (error) {
    return (
      <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded border">
        <h2 className="text-destructive mt-2 text-lg font-medium">
          Error loading analytics
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md text-center text-sm">
          {error.message ||
            "There was an error loading your analytics. Please try again later."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading state with better UX
  if (isLoading && !res) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-start">
          <div className="bg-muted h-10 w-48 animate-pulse rounded" />
        </div>
        <ChartSkeleton />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section>
      {/* Header with filter actions */}
      <div className="flex items-center justify-start">
        <FilterActions filterCategories={filterCategories} />
      </div>

      <div className="my-6 space-y-4">
        {/* Analytics Chart */}
        <Chart
          workspaceslug={workspace}
          timePeriod={timePeriod}
          searchParams={searchParamsObj}
          // Pass data directly to prevent duplicate API calls
          data={chartData}
          totalClicks={res?.totalClicks}
          isLoading={isLoading || isValidating}
          error={error}
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {/* URL Clicks */}
          <UrlClicks
            workspaceslug={workspace}
            searchParams={searchParamsObj}
            timePeriod={timePeriod}
            // Pass data directly to prevent duplicate API calls
            linksData={convertToFilterOptions.links}
            destinationsData={convertToFilterOptions.destinations}
            isLoading={isLoading || isValidating}
          />

          {/* Geo Clicks */}
          <GeoClicks
            workspaceslug={workspace}
            searchParams={searchParamsObj}
            timePeriod={timePeriod}
            // Pass data directly to prevent duplicate API calls
            citiesData={convertToFilterOptions.cities}
            countriesData={convertToFilterOptions.countries}
            continentsData={convertToFilterOptions.continents}
            isLoading={isLoading || isValidating}
            error={error}
          />

          {/* Device Clicks */}
          <DeviceClicks
            workspaceslug={workspace}
            searchParams={searchParamsObj}
            timePeriod={timePeriod}
            // Pass data directly to prevent duplicate API calls
            devicesData={convertToFilterOptions.devices}
            browsersData={convertToFilterOptions.browsers}
            osesData={convertToFilterOptions.oses}
            isLoading={isLoading || isValidating}
          />

          {/* Referrer Clicks */}
          <ReferrerClicks
            workspaceslug={workspace}
            searchParams={searchParamsObj}
            timePeriod={timePeriod}
            isLoading={isLoading || isValidating}
            error={error}
            referrersData={convertToFilterOptions.referrers}
          />
        </div>
      </div>
    </section>
  );
}
