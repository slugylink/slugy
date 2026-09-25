"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import UrlAvatar from "@/components/web/url-avatar";
import { TimePeriodSelector } from "@/components/web/_analytics/filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, ExternalLink, CornerDownRight, X } from "lucide-react";
import { useQueryState, parseAsString } from "nuqs";

const Chart = dynamic(() => import("@/components/web/_analytics/chart"), {
  loading: () => (
    <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />
  ),
});

const GeoClicks = dynamic(
  () => import("@/components/web/_analytics/geoclicks-card"),
  {
    loading: () => (
      <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />
    ),
  },
);

const DeviceClicks = dynamic(
  () => import("@/components/web/_analytics/deviceclicks-card"),
  {
    loading: () => (
      <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />
    ),
  },
);

const ReferrerClicks = dynamic(
  () => import("@/components/web/_analytics/referrerclicks-card"),
  {
    loading: () => (
      <div className="bg-muted h-64 w-full animate-pulse rounded-lg" />
    ),
  },
);

type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

const VALID_PERIODS: readonly TimePeriod[] = [
  "24h",
  "7d",
  "30d",
  "3m",
  "12m",
  "all",
];

interface ReportPayload {
  link: { slug: string; url: string; domain: string; createdAt: string };
  workspace: { name: string; logo: string | null };
  /** Effective period after the owner's retention clamp. */
  timePeriod?: TimePeriod;
  /** Owner's plan allows lead tracking at all. */
  leadTracking?: boolean;
  /** Owner toggled leads on for this specific report. */
  showLeads?: boolean;
  leads?: {
    total: number;
    overTime: Array<{ time: string; clicks: number }>;
  } | null;
  analytics: {
    totalClicks?: number;
    clicksOverTime?: Array<{ time: string; clicks: number }>;
    countries?: Array<{ country: string; clicks: number }>;
    cities?: Array<{ city: string; country: string; clicks: number }>;
    continents?: Array<{ continent: string; clicks: number }>;
    devices?: Array<{ device: string; clicks: number }>;
    browsers?: Array<{ browser: string; clicks: number }>;
    oses?: Array<{ os: string; clicks: number }>;
    referrers?: Array<{ referrer: string; clicks: number }>;
  };
}

const FILTER_KEYS = [
  "country_key",
  "city_key",
  "continent_key",
  "device_key",
  "browser_key",
  "os_key",
  "referrer_key",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

const FILTER_LABELS: Record<FilterKey, string> = {
  country_key: "Country",
  city_key: "City",
  continent_key: "Continent",
  device_key: "Device",
  browser_key: "Browser",
  os_key: "OS",
  referrer_key: "Referrer",
};

function ReportClient({ publicId }: { publicId: string }) {
  // Same contract as the dashboard analytics page: period lives in
  // ?time_period= (default 24h) so report links are shareable per range.
  const [periodParam, setPeriodParam] = useQueryState(
    "time_period",
    parseAsString.withDefault("24h"),
  );
  const period: TimePeriod = VALID_PERIODS.includes(periodParam as TimePeriod)
    ? (periodParam as TimePeriod)
    : "24h";
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Dashboard-style row filters land in the URL as ?{x}_key=… (TableCard
  // links). Forward them to the report API so they actually filter.
  const activeFilters = useMemo(() => {
    const out: Array<{ key: FilterKey; value: string }> = [];
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) out.push({ key, value });
    }
    return out;
  }, [searchParams]);
  const filterQuery = useMemo(
    () => activeFilters.map(({ key, value }) => `${key}=${value}`).join("&"),
    [activeFilters],
  );

  const clearFilter = useCallback(
    (key?: FilterKey) => {
      const next = new URLSearchParams(searchParams.toString());
      if (key) next.delete(key);
      else for (const k of FILTER_KEYS) next.delete(k);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const fetchReport = useCallback(
    async (pw?: string) => {
      setLoading(true);
      setAuthError(null);
      try {
        const params = new URLSearchParams({ timePeriod: period });
        for (const { key, value } of activeFilters) params.set(key, value);
        if (pw) params.set("password", pw);
        const res = await fetch(`/api/share/${publicId}?${params.toString()}`);
        const data = await res.json();
        if (res.status === 404) {
          setNotFound(true);
          setReport(null);
          return;
        }
        if (res.status === 401 || res.status === 403) {
          setNeedsPassword(true);
          setAuthError(
            typeof data?.error === "string" ? data.error : "Password required",
          );
          return;
        }
        if (!res.ok) throw new Error("Failed to load report");
        setNeedsPassword(false);
        setReport(data as ReportPayload);
      } catch {
        setAuthError("Failed to load report. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [publicId, period, activeFilters],
  );

  useEffect(() => {
    if (!needsPassword) void fetchReport(password || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, publicId, filterQuery]);

  const chartData = useMemo(
    () =>
      report?.analytics.clicksOverTime?.map((item) => ({
        time: String(item.time),
        clicks: item.clicks,
      })),
    [report?.analytics.clicksOverTime],
  );

  // Same contract as the dashboard Chart: the event toggle switches the
  // series between clicks and (shared) leads.
  const [eventParam] = useQueryState("event", parseAsString);
  const viewingLeads = eventParam === "leads";
  const canShowLeads = Boolean(
    report?.leadTracking && report?.showLeads && report?.leads,
  );
  const activeChartData = useMemo(
    () =>
      viewingLeads && canShowLeads
        ? (report?.leads?.overTime ?? []).map((item) => ({
            time: String(item.time),
            clicks: item.clicks,
          }))
        : chartData,
    [viewingLeads, canShowLeads, report?.leads?.overTime, chartData],
  );

  // Use the server's effective period so retention-clamped reports bucket
  // their chart consistently with the data returned.
  const effectivePeriod = report?.timePeriod ?? period;

  const sharedProps = useMemo(
    () => ({
      workspaceslug: "",
      searchParams: {},
      timePeriod: effectivePeriod,
      isLoading: loading && !report,
    }),
    [effectivePeriod, loading, report],
  );

  const shortUrl = report
    ? `https://${report.link.domain}/${report.link.slug}`
    : "";
  const cleanUrl = (report?.link.url ?? "")
    .replace("https://", "")
    .replace("http://", "")
    .replace("www.", "");

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">Report not found</h1>
        <p className="text-muted-foreground text-sm">
          This report link is invalid, expired, or no longer shared.
        </p>
        <a href="https://slugy.co" className="text-sm underline">
          Powered by Slugy
        </a>
      </div>
    );
  }

  if (needsPassword && !report) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6">
        <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold">Password protected report</h1>
        <p className="text-muted-foreground text-center text-sm">
          Enter the password shared with you to view this report.
        </p>
        <form
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void fetchReport(password);
          }}
        >
          <Input
            type="password"
            placeholder="Report password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={loading || !password}>
            Unlock
          </Button>
        </form>
        {authError && <p className="text-sm text-red-500">{authError}</p>}
        <p className="text-xs text-zinc-400">Powered by Slugy</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Branded header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold">Analytics</h3>
          </div>
          <TimePeriodSelector
            timePeriod={period}
            onTimePeriodChange={(value) => void setPeriodParam(value)}
            isPro
          />
        </header>

        {/* Link identity */}
        <div className="mb-4 flex w-full flex-row items-start space-y-0 rounded-xl border p-4 sm:items-center sm:space-x-4">
          <div className="hidden rounded-full sm:block">
            <UrlAvatar url={report?.link.url ?? ""} />
          </div>
          <div className="max-w-xs min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 sm:flex-row">
              <p className="text-sm leading-none font-medium">{shortUrl}</p>
            </div>
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              <CornerDownRight strokeWidth={1.5} size={15} />
              <p className="text-muted-foreground max-w-[calc(100%-3rem)] truncate">
                {cleanUrl}
              </p>
            </div>
          </div>
          {report?.link.url && (
            <a
              href={report.link.url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground ml-auto shrink-0"
              aria-label="Open destination"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Active row filters (clicking a table row sets these) */}
        {activeFilters.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeFilters.map(({ key, value }) => (
              <Badge
                key={key}
                variant="secondary"
                className="flex items-center gap-1.5 py-1 pr-1 pl-2.5 text-xs font-normal"
              >
                <span className="text-muted-foreground">
                  {FILTER_LABELS[key]}:
                </span>
                <span className="max-w-40 truncate font-medium">{value}</span>
                <button
                  type="button"
                  onClick={() => clearFilter(key)}
                  className="hover:bg-muted rounded-full p-0.5"
                  aria-label={`Remove ${FILTER_LABELS[key]} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button
              type="button"
              onClick={() => clearFilter()}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Dashboard-identical analytics */}
        <section>
          <div className="my-6 space-y-4">
            <Chart
              data={activeChartData}
              totalClicks={report?.analytics.totalClicks ?? 0}
              totalLeads={canShowLeads ? (report?.leads?.total ?? 0) : null}
              timePeriod={effectivePeriod}
              isLoading={loading && !report}
              canUseLeadTracking={canShowLeads}
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <GeoClicks
                {...sharedProps}
                citiesData={report?.analytics.cities ?? []}
                countriesData={report?.analytics.countries ?? []}
                continentsData={report?.analytics.continents ?? []}
              />
              <DeviceClicks
                {...sharedProps}
                devicesData={report?.analytics.devices ?? []}
                browsersData={report?.analytics.browsers ?? []}
                osesData={report?.analytics.oses ?? []}
              />
              <ReferrerClicks
                {...sharedProps}
                referrersData={report?.analytics.referrers ?? []}
                utmSourcesData={[]}
                utmMediumsData={[]}
                utmCampaignsData={[]}
                utmTermsData={[]}
                utmContentsData={[]}
              />
              <Card className="border shadow-none">
                <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 p-6 text-center">
                  <p className="text-sm font-medium">Powered by Slugy</p>
                  <p className="text-muted-foreground max-w-xs text-xs">
                    Branded short links, QR codes, and client-ready analytics
                    reports for this workspace.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <a href="https://slugy.co" target="_blank" rel="noreferrer">
                      Create your own
                    </a>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-zinc-400">
          Powered by{" "}
          <a href="https://slugy.co" className="font-medium underline">
            Slugy
          </a>
        </footer>
      </div>
    </div>
  );
}

export default function ShareReportPage({ publicId }: { publicId: string }) {
  return (
    <Suspense>
      <ReportClient publicId={publicId} />
    </Suspense>
  );
}
