"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAnalytics } from "@/hooks/use-analytics";
import FilterActions, {
  type CategoryId,
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

// Dynamic imports with SSR disabled (client-only)
const Chart = dynamic(() => import("@/components/web/_analytics/chart"), {
  ssr: true,
});
const UrlClicks = dynamic(
  () => import("@/components/web/_analytics/urlclicks-card"),
  { ssr: true },
);
const GeoClicks = dynamic(
  () => import("@/components/web/_analytics/geoclicks-card"), 
  { ssr: true },
);
const DeviceClicks = dynamic(
  () => import("@/components/web/_analytics/deviceclicks-card"),
  { ssr: false },
);
const ReferrerClicks = dynamic(
  () => import("@/components/web/_analytics/referrerclicks-card"),
  { ssr: false },
);

interface AnalyticsClientProps {
  workspace: string;
}

export function AnalyticsClient({ workspace }: AnalyticsClientProps) {
  const searchParams = useSearchParams();
  const timePeriod =
    (searchParams.get("time_period") as
      | "24h"
      | "7d"
      | "30d"
      | "3m"
      | "12m"
      | "all") || "24h";

  // Get all search params as an object
  const searchParamsObj = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  // Use the new analytics hook to fetch all data at once
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
      "destinations"
    ],
  });

  // Helper function to convert analytics data to FilterOption types
  const convertToFilterOptions = useMemo(() => {
    return {
      links: (links as Array<{ slug: string; url: string; clicks: number }>)?.map(item => ({
        slug: item.slug,
        url: item.url,
        clicks: item.clicks
      })) || [],
      countries: (countries as Array<{ country: string; clicks: number }>)?.map(item => ({
        country: item.country,
        clicks: item.clicks
      })) || [],
      cities: (cities as Array<{ city: string; country: string; clicks: number }>)?.map(item => ({
        city: item.city,
        country: item.country,
        clicks: item.clicks
      })) || [],
      continents: (continents as Array<{ continent: string; clicks: number }>)?.map(item => ({
        continent: item.continent,
        clicks: item.clicks
      })) || [],
      browsers: (browsers as Array<{ browser: string; clicks: number }>)?.map(item => ({
        browser: item.browser,
        clicks: item.clicks
      })) || [],
      oses: (oses as Array<{ os: string; clicks: number }>)?.map(item => ({
        os: item.os,
        clicks: item.clicks
      })) || [],
      devices: (devices as Array<{ device: string; clicks: number }>)?.map(item => ({
        device: item.device,
        clicks: item.clicks
      })) || [],
      referrers: (referrers as Array<{ referrer: string; clicks: number }>)?.map(item => ({
        referrer: item.referrer,
        clicks: item.clicks
      })) || [],
      destinations: (destinations as Array<{ destination: string; clicks: number }>)?.map(item => ({
        destination: item.destination,
        clicks: item.clicks
      })) || [],
    };
  }, [links, countries, cities, continents, browsers, oses, devices, referrers, destinations]);

  // Memoize filter categories to prevent unnecessary re-renders
  const filterCategories = useMemo(
    () => [
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

  if (error) {
    return (
      <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded border">
        <h2 className="mt-2 text-lg font-medium">Error loading analytics</h2>
        <p className="mt-2 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
          {error.message ||
            "There was an error loading your analytics. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-8 flex h-full max-w-6xl flex-col">
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
          data={res?.clicksOverTime?.map(item => ({
            time: item.time instanceof Date ? item.time.toISOString() : item.time,
            clicks: item.clicks
          }))}
          totalClicks={res?.totalClicks}
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
            isLoading={isLoading}
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
            isLoading={isLoading}
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
            isLoading={isLoading}
          />
          {/* Referrer Clicks */}
          <ReferrerClicks
            workspaceslug={workspace}
            searchParams={searchParamsObj}
            timePeriod={timePeriod}
            // Pass data directly to prevent duplicate API calls
            referrersData={convertToFilterOptions.referrers}
          />
        </div>
      </div>
    </div>
  );
}
