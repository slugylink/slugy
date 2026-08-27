"use client";

import dynamic from "next/dynamic";
import { memo, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAnalytics,
  type AnalyticsData,
  type TimePeriod,
} from "@/hooks/use-analytics";
import FilterActions, {
  type CategoryId,
  type FilterCategory,
} from "@/components/web/_analytics/filter";
import { parseAnalyticsEvent } from "@/components/web/_analytics/leads-demo-data";
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

interface AnalyticsClientProps {
  workspace: string;
}

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

type FilterSource = Pick<
  AnalyticsData,
  | "links"
  | "countries"
  | "cities"
  | "continents"
  | "browsers"
  | "oses"
  | "devices"
  | "referrers"
  | "destinations"
>;

const DEFAULT_TIME_PERIOD: TimePeriod = "24h";

const VALID_TIME_PERIODS = [
  "24h",
  "7d",
  "30d",
  "3m",
  "12m",
  "all",
] as const satisfies readonly TimePeriod[];

const VALID_FILTER_KEYS = [
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
] as const satisfies readonly FilterKey[];

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
] as const satisfies readonly (keyof AnalyticsData)[];

const ICON_PROPS = {
  className: "h-4 w-4",
  strokeWidth: 1.3,
} as const;

const CardSkeleton = () => (
  <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />
);

const Chart = dynamic(() => import("@/components/web/_analytics/chart"), {
  loading: CardSkeleton,
});

const UrlClicks = dynamic(
  () => import("@/components/web/_analytics/urlclicks-card"),
  { loading: CardSkeleton },
);

const GeoClicks = dynamic(
  () => import("@/components/web/_analytics/geoclicks-card"),
  { loading: CardSkeleton },
);

const DeviceClicks = dynamic(
  () => import("@/components/web/_analytics/deviceclicks-card"),
  { loading: CardSkeleton },
);

const ReferrerClicks = dynamic(
  () => import("@/components/web/_analytics/referrerclicks-card"),
  { loading: CardSkeleton },
);

function isValidTimePeriod(period: string | null): period is TimePeriod {
  return Boolean(
    period && (VALID_TIME_PERIODS as readonly string[]).includes(period),
  );
}

function extractFilterParams(
  searchParams: URLSearchParams,
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of VALID_FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value) params[key] = value;
  }
  return params;
}

function normalizeChartData(
  clicksOverTime: AnalyticsData["clicksOverTime"] | undefined,
) {
  if (!clicksOverTime?.length) return undefined;
  return clicksOverTime.map((item) => ({
    time:
      item.time instanceof Date ? item.time.toISOString() : String(item.time),
    clicks: item.clicks,
  }));
}

function buildFilterCategories(data: FilterSource): FilterCategory[] {
  return [
    {
      id: "slug_key" as CategoryId,
      label: "Link",
      icon: <LinkIcon {...ICON_PROPS} />,
      options: data.links,
    },
    {
      id: "country_key" as CategoryId,
      label: "Country",
      icon: <Flag {...ICON_PROPS} />,
      options: data.countries,
    },
    {
      id: "city_key" as CategoryId,
      label: "City",
      icon: <MapPinned {...ICON_PROPS} />,
      options: data.cities,
    },
    {
      id: "continent_key" as CategoryId,
      label: "Continent",
      icon: <Map {...ICON_PROPS} />,
      options: data.continents,
    },
    {
      id: "browser_key" as CategoryId,
      label: "Browser",
      icon: <Chrome {...ICON_PROPS} />,
      options: data.browsers,
    },
    {
      id: "os_key" as CategoryId,
      label: "OS",
      icon: <Box {...ICON_PROPS} />,
      options: data.oses,
    },
    {
      id: "device_key" as CategoryId,
      label: "Device",
      icon: <Smartphone {...ICON_PROPS} />,
      options: data.devices,
    },
    {
      id: "referrer_key" as CategoryId,
      label: "Referrer",
      icon: <Share2 {...ICON_PROPS} />,
      options: data.referrers,
    },
    {
      id: "destination_key" as CategoryId,
      label: "Destination URL",
      icon: <Redo2 {...ICON_PROPS} />,
      options: data.destinations,
    },
  ];
}

export const AnalyticsClient = memo(function AnalyticsClient({
  workspace,
}: AnalyticsClientProps) {
  const searchParams = useSearchParams();

  const timePeriod = useMemo(() => {
    const period = searchParams.get("time_period");
    return isValidTimePeriod(period) ? period : DEFAULT_TIME_PERIOD;
  }, [searchParams]);

  const event = useMemo(
    () => parseAnalyticsEvent(searchParams.get("event")),
    [searchParams],
  );
  const isLeads = event === "leads";
  const isFunnel = searchParams.get("view") === "funnel";

  const filterParams = useMemo(
    () => extractFilterParams(searchParams),
    [searchParams],
  );

  const clicks = useAnalytics({
    workspaceslug: workspace,
    timePeriod,
    searchParams: filterParams,
    metrics: isLeads ? (["totalClicks"] as const) : ANALYTICS_METRICS,
    analyticsEvent: "clicks",
  });

  const leads = useAnalytics({
    workspaceslug: workspace,
    timePeriod,
    searchParams: filterParams,
    metrics: isLeads ? ANALYTICS_METRICS : (["totalClicks"] as const),
    analyticsEvent: "leads",
    enabled: isLeads || isFunnel,
  });

  const active = isLeads ? leads : clicks;

  const [cachedLeadsTotal, setCachedLeadsTotal] = useState<number | null>(null);
  useEffect(() => {
    if (leads.data?.totalClicks != null) {
      setCachedLeadsTotal(leads.data.totalClicks);
    }
  }, [leads.data?.totalClicks]);

  const funnelLoading =
    isFunnel &&
    (clicks.isLoading || leads.isLoading) &&
    clicks.data?.totalClicks == null &&
    leads.data?.totalClicks == null;

  const filterSource = useMemo<FilterSource>(
    () => ({
      links: active.links,
      countries: active.countries,
      cities: active.cities,
      continents: active.continents,
      browsers: active.browsers,
      oses: active.oses,
      devices: active.devices,
      referrers: active.referrers,
      destinations: active.destinations,
    }),
    [
      active.links,
      active.countries,
      active.cities,
      active.continents,
      active.browsers,
      active.oses,
      active.devices,
      active.referrers,
      active.destinations,
    ],
  );

  const filterCategories = useMemo(
    () => buildFilterCategories(filterSource),
    [filterSource],
  );

  const chartData = useMemo(
    () => normalizeChartData(active.data?.clicksOverTime),
    [active.data?.clicksOverTime],
  );

  const hasResolvedData = Boolean(active.data);
  const showInitialLoadingState =
    (active.isLoading && !hasResolvedData && !active.error) || funnelLoading;
  const chartRefreshing = active.isValidating && hasResolvedData;

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
      <div className="flex items-center justify-start">
        <FilterActions filterCategories={filterCategories} />
      </div>

      <div className="my-6 space-y-4">
        <Chart
          {...sharedProps}
          data={chartData}
          totalClicks={clicks.data?.totalClicks ?? 0}
          totalLeads={
            isLeads || isFunnel
              ? (leads.data?.totalClicks ?? null)
              : cachedLeadsTotal
          }
          isRefreshing={chartRefreshing}
          error={active.error ?? undefined}
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <UrlClicks
            {...sharedProps}
            linksData={filterSource.links}
            destinationsData={filterSource.destinations}
          />
          <GeoClicks
            {...sharedProps}
            citiesData={filterSource.cities}
            countriesData={filterSource.countries}
            continentsData={filterSource.continents}
          />
          <DeviceClicks
            {...sharedProps}
            devicesData={filterSource.devices}
            browsersData={filterSource.browsers}
            osesData={filterSource.oses}
          />
          <ReferrerClicks
            {...sharedProps}
            referrersData={filterSource.referrers}
          />
        </div>
      </div>
    </section>
  );
});
