"use client";
import dynamic from "next/dynamic";
import FilterActions, {
  type CategoryId,
} from "@/components/web/_analytics/filter";
import { Box, Chrome, Flag, LinkIcon, Map, MapPinned, Smartphone, Share2, ExternalLink } from "lucide-react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { type AnalyticsResponse } from "@/server/actions/analytics/analytics";
import { fetchAnalyticsData } from "@/server/actions/analytics/use-analytics";
import { useMemo } from "react";

// Dynamic imports with loading states
const Chart = dynamic(() => import("@/components/web/_analytics/chart"), {
  ssr: true,
});

const UrlClicks = dynamic(
  () => import("@/components/web/_analytics/urlclicks-card"),
  {
    ssr: true,
  },
);

const GeoClicks = dynamic(
  () => import("@/components/web/_analytics/geoclicks-card"),
  {
    ssr: true,
  },
);

const DeviceClicks = dynamic(
  () => import("@/components/web/_analytics/deviceclicks-card"),
  {
    ssr: false,
  },
);

const ReferrerClicks = dynamic(
  () => import("@/components/web/_analytics/referrerclicks-card"),
  {
    ssr: false,
  },
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
  
  const { data: res, error } = useSWR<AnalyticsResponse, Error>(
    ["analytics", workspace, searchParamsObj],
    () => fetchAnalyticsData(workspace, searchParamsObj),
  );

  // Memoize filter categories to prevent unnecessary re-renders
  const filterCategories = useMemo(
    () => [
      {
        id: "slug_key" as CategoryId,
        label: "Link",
        icon: <LinkIcon className="h-4 w-4" strokeWidth={1.3} />,
        options: res?.links ?? [],
      },
      {
        id: "country_key" as CategoryId,
        label: "Country",
        icon: <Flag className="h-4 w-4" strokeWidth={1.3} />,
        options: res?.countries ?? [],
      },
      {
        id: "city_key" as CategoryId,
        label: "City",
        icon: <MapPinned className="h-4 w-4" strokeWidth={1.3} />,
        options: res?.cities ?? [],
      },
      {
        id: "continent_key" as CategoryId,
        label: "Continent",
        icon: <Map className="h-4 w-4" strokeWidth={1.3} />,
        options: res?.continents ?? [],
      },
      {
        id: "browser_key" as CategoryId,
        label: "Browser",
        icon: <Chrome className="h-4 w-4" strokeWidth={1.3} />,
        options: res?.browsers ?? [],
      },
      {
        id: "os_key" as CategoryId,
        label: "OS",
        icon: <Box className="h-4 w-4" strokeWidth={1.3} />,
        options: res?.oses ?? [],
      },
      {
        id: "device_key" as CategoryId,
        label: "Device",
        icon: <Smartphone className="h-4 w-4" strokeWidth={1.3} />,
        options: res?.devices ?? [],
      },
      {
        id: "referrer_key" as CategoryId,
        label: "Referrer",
        icon: <Share2 className="h-4 w-4" strokeWidth={1.3} />,
        options: res?.referrers ?? [],
      },
      {
        id: "destination_key" as CategoryId,
        label: "Destination",
        icon: <ExternalLink className="h-4 w-4" strokeWidth={1.3} />,
        options: res?.destinations ?? [],
      },
    ],
    [res],
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
        <FilterActions fillterCategory={filterCategories} />
      </div>
      <div className="my-6 space-y-4">
        {/* Analytics Chart */}

        <Chart
          workspaceslug={workspace}
          timePeriod={timePeriod}
          searchParams={searchParamsObj}
        />

        <div className="grid mt-5 gap-4 md:grid-cols-2">
          {/* URL Clicks */}
          <UrlClicks
            workspaceslug={workspace}
            searchParams={searchParamsObj}
          />
          {/* Geo Clicks */}
          <GeoClicks
            workspaceslug={workspace}
            searchParams={searchParamsObj}
          />
          {/* Device Clicks */}{" "}
          <DeviceClicks
            workspaceslug={workspace}
            searchParams={searchParamsObj}
          />
          {/* Referrer Clicks */}
          <ReferrerClicks
            workspaceslug={workspace}
            searchParams={searchParamsObj}
          />
        </div>
      </div>
    </div>
  );
} 