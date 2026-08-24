"use client";

import useSWR from "swr";
import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import UrlAvatar from "@/components/web/url-avatar";
import { Card, CardHeader } from "@/components/ui/card";
import TableCard from "@/components/web/_analytics/table-card";
import FilterActions, {
  type FilterCategory,
} from "@/components/web/_analytics/filter";
import { LinkIcon, Tag } from "lucide-react";

type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

interface LeadsAnalyticsData {
  totalLeads: number;
  leadsOverTime: Array<{ time: string; clicks: number }>;
  links: Array<{
    slug: string;
    url: string;
    domain: string;
    clicks: number;
    leads: number;
  }>;
  eventNames: Array<{ eventName: string; clicks: number; leads: number }>;
}

const VALID_TIME_PERIODS: readonly TimePeriod[] = [
  "24h",
  "7d",
  "30d",
  "3m",
  "12m",
  "all",
] as const;

const Chart = dynamic(() => import("@/components/web/_analytics/chart"), {
  ssr: true,
});

const fetcher = async (url: string): Promise<LeadsAnalyticsData> => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || "Failed to load leads");
  }
  return res.json();
};

function parseTimePeriod(value: string | null): TimePeriod {
  if (value && (VALID_TIME_PERIODS as readonly string[]).includes(value)) {
    return value as TimePeriod;
  }
  return "24h";
}

interface LeadsAnalyticsClientProps {
  workspace: string;
}

export function LeadsAnalyticsClient({ workspace }: LeadsAnalyticsClientProps) {
  const searchParams = useSearchParams();
  const timePeriod = parseTimePeriod(searchParams.get("time_period"));
  const slugKey = searchParams.get("slug_key");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("time_period", timePeriod);
    if (slugKey) params.set("slug_key", slugKey);
    return params.toString();
  }, [timePeriod, slugKey]);

  const { data, error, isLoading, isValidating } = useSWR<LeadsAnalyticsData>(
    `/api/workspace/${workspace}/analytics/leads?${query}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  const chartData = useMemo(
    () =>
      (data?.leadsOverTime ?? []).map((item) => ({
        time: item.time,
        clicks: item.clicks,
      })),
    [data?.leadsOverTime],
  );

  const filterCategories = useMemo<FilterCategory[]>(
    () => [
      {
        id: "slug_key",
        label: "Links",
        icon: <LinkIcon className="h-4 w-4" strokeWidth={1.3} />,
        options: (data?.links ?? []).map((l) => ({
          slug: l.slug,
          url: l.url,
          clicks: l.leads,
        })),
      },
    ],
    [data?.links],
  );

  const hasData = Boolean(data);
  const showLoading = isLoading && !hasData;

  if (error) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">
        {error.message || "Failed to load leads analytics"}
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-start">
          <FilterActions filterCategories={filterCategories} />
        </div>
        <Link
          href={`/${workspace}/settings/api-keys`}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          API keys & lead tracking docs →
        </Link>
      </div>

      <div className="my-6 space-y-4">
        <Chart
          workspaceslug={workspace}
          timePeriod={timePeriod}
          data={chartData}
          totalClicks={undefined}
          totalLeads={data?.totalLeads ?? 0}
          mode="leads"
          isLoading={showLoading}
          isRefreshing={isValidating && hasData}
        />

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex-1 text-sm font-medium">Short Links</div>
                <div className="min-w-[80px] text-right text-sm">Leads</div>
              </div>
            </CardHeader>
            <div className="px-4 pb-4">
              <TableCard
                data={data?.links ?? []}
                loading={showLoading}
                error={error}
                keyPrefix="lead-link"
                dataKey="leads-links"
                emptyText="No leads yet"
                getClicks={(item) => item.leads}
                getKey={(item, i) => `${item.domain}/${item.slug}-${i}`}
                progressColor="bg-emerald-200/50"
                NameComponent={({ item }) => (
                  <div className="flex items-center gap-x-2">
                    <UrlAvatar
                      className="flex-shrink-0 rounded-sm"
                      size={5}
                      imgSize={4}
                      url={item.url}
                    />
                    <span className="line-clamp-1 max-w-[220px] text-ellipsis">
                      {item.domain}/{item.slug}
                    </span>
                  </div>
                )}
              />
            </div>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4" strokeWidth={1.3} />
                  Events
                </div>
                <div className="min-w-[80px] text-right text-sm">Leads</div>
              </div>
            </CardHeader>
            <div className="px-4 pb-4">
              <TableCard
                data={data?.eventNames ?? []}
                loading={showLoading}
                error={error}
                keyPrefix="lead-event"
                dataKey="leads-events"
                emptyText="No lead events yet"
                getClicks={(item) => item.leads}
                getKey={(item, i) => `${item.eventName}-${i}`}
                progressColor="bg-emerald-200/50"
                NameComponent={({ item }) => (
                  <span className="line-clamp-1 max-w-[260px] text-ellipsis">
                    {item.eventName}
                  </span>
                )}
              />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
