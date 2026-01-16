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

// Constants for better maintainability
const DEFAULT_TIME_PERIOD = "24h";

// Default metrics to fetch (all available metrics)
// Note: useAnalytics hook won't send this to API if it matches defaults (optimization)
const ANALYTICS_METRICS: Array<
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
  | "destinations"
> = [
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

// Dynamic imports with optimized loading
const Chart = dynamic(() => import("@/components/web/_analytics/chart"), {
  ssr: true,
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

function CardSkeleton() {
  return <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />;
}

interface AnalyticsClientProps {
  workspace: string;
}

export const AnalyticsClient = memo(function AnalyticsClient({
  workspace,
}: AnalyticsClientProps) {
  const searchParams = useSearchParams();

  const timePeriod = useMemo(() => {
    const period = searchParams.get("time_period");
    const validPeriods = ["24h", "7d", "30d", "3m", "12m", "all"] as const;
    return validPeriods.includes(period as (typeof validPeriods)[number])
      ? (period as (typeof validPeriods)[number])
      : DEFAULT_TIME_PERIOD;
  }, [searchParams]);

  // Only extract filter parameters (exclude time_period as it's passed separately)
  // This reduces redundancy and ensures clean parameter passing to useAnalytics
  const filterParams = useMemo(() => {
    const validFilterKeys = [
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
    
    const params: Record<string, string> = {};
    validFilterKeys.forEach((key) => {
      const value = searchParams.get(key);
      // Only include non-empty filter values
      if (value) {
        params[key] = value;
      }
    });
    
    return params;
  }, [searchParams]);

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
    searchParams: filterParams,
    metrics: ANALYTICS_METRICS,
  });

  const linksFilterOptions = (links as Array<{ slug: string; url: string; domain: string; clicks: number }>)?.map(
    (item) => ({
      slug: item.slug,
      url: item.url,
      domain: item.domain,
      clicks: item.clicks,
    }),
  ) || [];

  const countriesFilterOptions = (countries as Array<{ country: string; clicks: number }>)?.map(
    (item) => ({
      country: item.country,
      clicks: item.clicks,
    }),
  ) || [];

  const citiesFilterOptions = (cities as Array<{ city: string; country: string; clicks: number }>)?.map(
    (item) => ({
      city: item.city,
      country: item.country,
      clicks: item.clicks,
    }),
  ) || [];

  const continentsFilterOptions = (continents as Array<{ continent: string; clicks: number }>)?.map(
    (item) => ({
      continent: item.continent,
      clicks: item.clicks,
    }),
  ) || [];

  const browsersFilterOptions = (browsers as Array<{ browser: string; clicks: number }>)?.map((item) => ({
    browser: item.browser,
    clicks: item.clicks,
  })) || [];

  const osesFilterOptions = (oses as Array<{ os: string; clicks: number }>)?.map((item) => ({
    os: item.os,
    clicks: item.clicks,
  })) || [];

  const devicesFilterOptions = (devices as Array<{ device: string; clicks: number }>)?.map((item) => ({
    device: item.device,
    clicks: item.clicks,
  })) || [];

  const referrersFilterOptions = (referrers as Array<{ referrer: string; clicks: number }>)?.map(
    (item) => ({
      referrer: item.referrer,
      clicks: item.clicks,
    }),
  ) || [];

  const destinationsFilterOptions = (destinations as Array<{ destination: string; clicks: number }>)?.map(
    (item) => ({
      destination: item.destination,
      clicks: item.clicks,
    }),
  ) || [];

  const filterCategories: FilterCategory[] = [
    {
      id: "slug_key" as CategoryId,
      label: "Link",
      icon: <LinkIcon className="h-4 w-4" strokeWidth={1.3} />,
      options: linksFilterOptions,
    },
    {
      id: "country_key" as CategoryId,
      label: "Country",
      icon: <Flag className="h-4 w-4" strokeWidth={1.3} />,
      options: countriesFilterOptions,
    },
    {
      id: "city_key" as CategoryId,
      label: "City",
      icon: <MapPinned className="h-4 w-4" strokeWidth={1.3} />,
      options: citiesFilterOptions,
    },
    {
      id: "continent_key" as CategoryId,
      label: "Continent",
      icon: <Map className="h-4 w-4" strokeWidth={1.3} />,
      options: continentsFilterOptions,
    },
    {
      id: "browser_key" as CategoryId,
      label: "Browser",
      icon: <Chrome className="h-4 w-4" strokeWidth={1.3} />,
      options: browsersFilterOptions,
    },
    {
      id: "os_key" as CategoryId,
      label: "OS",
      icon: <Box className="h-4 w-4" strokeWidth={1.3} />,
      options: osesFilterOptions,
    },
    {
      id: "device_key" as CategoryId,
      label: "Device",
      icon: <Smartphone className="h-4 w-4" strokeWidth={1.3} />,
      options: devicesFilterOptions,
    },
    {
      id: "referrer_key" as CategoryId,
      label: "Referrer",
      icon: <Share2 className="h-4 w-4" strokeWidth={1.3} />,
      options: referrersFilterOptions,
    },
    {
      id: "destination_key" as CategoryId,
      label: "Destination URL",
      icon: <Redo2 className="h-4 w-4" strokeWidth={1.3} />,
      options: destinationsFilterOptions,
    },
  ];

  const chartData = res?.clicksOverTime?.map((item) => ({
    time: item.time instanceof Date ? item.time.toISOString() : item.time,
    clicks: item.clicks,
  }));

  const sharedProps = {
    workspaceslug: workspace,
    searchParams: filterParams,
    timePeriod,
    isLoading: isLoading || isValidating,
    error,
  };

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
  return (
    <section>
      {/* Header with filter actions */}
      <div className="flex items-center justify-start">
        <FilterActions filterCategories={filterCategories} />
      </div>

      <div className="my-6 space-y-4">
        {/* Analytics Chart */}
        <Chart
          {...sharedProps}
          data={chartData}
          totalClicks={res?.totalClicks}
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {/* URL Clicks */}
          <UrlClicks
            {...sharedProps}
            linksData={linksFilterOptions}
            destinationsData={destinationsFilterOptions}
          />

          {/* Geo Clicks */}
          <GeoClicks
            {...sharedProps}
            citiesData={citiesFilterOptions}
            countriesData={countriesFilterOptions}
            continentsData={continentsFilterOptions}
          />

          {/* Device Clicks */}
          <DeviceClicks
            {...sharedProps}
            devicesData={devicesFilterOptions}
            browsersData={browsersFilterOptions}
            osesData={osesFilterOptions}
          />

          {/* Referrer Clicks */}
          <ReferrerClicks
            {...sharedProps}
            referrersData={referrersFilterOptions}
          />
        </div>
      </div>
    </section>
  );
});
