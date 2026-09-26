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
import {
  DEMO_ANALYTICS_DATA,
  parseAnalyticsEvent,
} from "@/constants/data/demo-analytics-data";
import { useSubscriptionStore } from "@/store/subscription";
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
  "utmSources",
  "utmMediums",
  "utmCampaigns",
  "utmTerms",
  "utmContents",
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
  clicksOverTime:
    | AnalyticsData["clicksOverTime"]
    | Array<{ time: string; clicks: number }>
    | undefined,
) {
  if (!clicksOverTime?.length) return undefined;
  return clicksOverTime.map((item) => ({
    time:
      item.time instanceof Date ? item.time.toISOString() : String(item.time),
    clicks: item.clicks,
  }));
}

/**
 * Sales series plots revenue amounts (Dub-style), carrying the sale count
 * per bucket for the tooltip ("16 ($241)").
 */
function normalizeRevenueChartData(
  revenueOverTime:
    | Array<{ time: Date | string; revenue: number; sales: number }>
    | undefined,
) {
  if (!revenueOverTime?.length) return undefined;
  return revenueOverTime.map((item) => ({
    time:
      item.time instanceof Date ? item.time.toISOString() : String(item.time),
    clicks: item.revenue,
    sales: item.sales,
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
  const { isPro, isBusiness, fetchSubscription } = useSubscriptionStore();
  const isDemo = searchParams.get("demo") === "true";
  const canUseLeadTracking = isPro || isDemo;
  const canUseSalesAnalytics = isBusiness || isDemo;

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  const timePeriod = useMemo(() => {
    const period = searchParams.get("time_period");
    if (isValidTimePeriod(period)) return period;
    return isDemo ? "30d" : DEFAULT_TIME_PERIOD;
  }, [isDemo, searchParams]);

  const event = useMemo(
    () => parseAnalyticsEvent(searchParams.get("event")),
    [searchParams],
  );
  const isLeads = event === "leads";
  const isSales = event === "sales";
  const isFunnel = searchParams.get("view") === "funnel";
  const viewingLeads = isLeads && canUseLeadTracking;
  const viewingSales = isSales && canUseSalesAnalytics;

  const filterParams = useMemo(
    () => extractFilterParams(searchParams),
    [searchParams],
  );

  const clicks = useAnalytics({
    workspaceslug: workspace,
    timePeriod,
    searchParams: filterParams,
    metrics:
      isLeads || isSales ? (["totalClicks"] as const) : ANALYTICS_METRICS,
    analyticsEvent: "clicks",
    enabled: !isDemo,
  });

  const leads = useAnalytics({
    workspaceslug: workspace,
    timePeriod,
    searchParams: filterParams,
    metrics: isLeads ? ANALYTICS_METRICS : (["totalClicks"] as const),
    analyticsEvent: "leads",
    enabled: !isDemo && canUseLeadTracking && (isLeads || isFunnel),
  });

  const sales = useAnalytics({
    workspaceslug: workspace,
    timePeriod,
    searchParams: filterParams,
    metrics: isSales ? ANALYTICS_METRICS : (["totalClicks"] as const),
    analyticsEvent: "sales",
    enabled: !isDemo && canUseSalesAnalytics && (isSales || isFunnel),
  });

  const active = viewingSales ? sales : viewingLeads ? leads : clicks;
  const activeData = isDemo ? DEMO_ANALYTICS_DATA[event] : active.data;

  const [cachedLeadsTotal, setCachedLeadsTotal] = useState<number | null>(null);
  useEffect(() => {
    if (canUseLeadTracking && leads.data?.totalClicks != null) {
      setCachedLeadsTotal(leads.data.totalClicks);
    }
  }, [canUseLeadTracking, leads.data?.totalClicks]);

  const funnelNeedsSales = isFunnel && canUseSalesAnalytics;
  const funnelLoading =
    isFunnel &&
    canUseLeadTracking &&
    (clicks.isLoading ||
      leads.isLoading ||
      (funnelNeedsSales && sales.isLoading)) &&
    (clicks.data?.totalClicks == null ||
      leads.data?.totalClicks == null ||
      (funnelNeedsSales && sales.data?.totalClicks == null));

  const filterSource = useMemo<FilterSource>(
    () => ({
      links: activeData?.links ?? [],
      countries: activeData?.countries ?? [],
      cities: activeData?.cities ?? [],
      continents: activeData?.continents ?? [],
      browsers: activeData?.browsers ?? [],
      oses: activeData?.oses ?? [],
      devices: activeData?.devices ?? [],
      referrers: activeData?.referrers ?? [],
      destinations: activeData?.destinations ?? [],
    }),
    [
      activeData?.links,
      activeData?.countries,
      activeData?.cities,
      activeData?.continents,
      activeData?.browsers,
      activeData?.oses,
      activeData?.devices,
      activeData?.referrers,
      activeData?.destinations,
    ],
  );

  const filterCategories = useMemo(
    () => buildFilterCategories(filterSource),
    [filterSource],
  );

  const chartData = useMemo(() => {
    if (viewingSales) {
      const revenueSeries = isDemo
        ? DEMO_ANALYTICS_DATA.sales.revenueOverTime
        : sales.data?.revenueOverTime;
      const normalized = normalizeRevenueChartData(revenueSeries);
      if (normalized) return normalized;
    }
    return normalizeChartData(activeData?.clicksOverTime);
  }, [
    viewingSales,
    isDemo,
    sales.data?.revenueOverTime,
    activeData?.clicksOverTime,
  ]);

  const hasResolvedData = Boolean(activeData);
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
          totalClicks={
            isDemo
              ? DEMO_ANALYTICS_DATA.clicks.totalClicks
              : (clicks.data?.totalClicks ?? 0)
          }
          totalLeads={
            canUseLeadTracking && (isLeads || isFunnel)
              ? isDemo
                ? DEMO_ANALYTICS_DATA.leads.totalClicks
                : (leads.data?.totalClicks ?? null)
              : cachedLeadsTotal
          }
          totalSales={
            canUseSalesAnalytics && (isSales || isFunnel)
              ? isDemo
                ? DEMO_ANALYTICS_DATA.sales.totalClicks
                : (sales.data?.totalSales ?? sales.data?.totalClicks ?? null)
              : null
          }
          totalRevenue={
            canUseSalesAnalytics && (isSales || isFunnel)
              ? isDemo
                ? (DEMO_ANALYTICS_DATA.sales.totalRevenue ?? null)
                : (sales.data?.totalRevenue ?? null)
              : null
          }
          isRefreshing={chartRefreshing}
          error={active.error ?? undefined}
          canUseLeadTracking={canUseLeadTracking}
          canUseSalesAnalytics={canUseSalesAnalytics}
          workspaceSlug={workspace}
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
            utmSourcesData={activeData?.utmSources ?? []}
            utmMediumsData={activeData?.utmMediums ?? []}
            utmCampaignsData={activeData?.utmCampaigns ?? []}
            utmTermsData={activeData?.utmTerms ?? []}
            utmContentsData={activeData?.utmContents ?? []}
          />
        </div>
      </div>
    </section>
  );
});
