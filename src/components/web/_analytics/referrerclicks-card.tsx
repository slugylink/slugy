"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MousePointerClick } from "lucide-react";
import UrlAvatar from "@/components/web/url-avatar";
import TableCard from "./table-card";
import AnalyticsDialog from "./analytics-dialog";

interface ReferrerClicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
  timePeriod: "24h" | "7d" | "30d" | "3m" | "12m" | "all";
  referrersData?: Array<{ referrer: string; clicks: number }>;
  utmSourcesData?: Array<{ source: string; clicks: number }>;
  utmMediumsData?: Array<{ medium: string; clicks: number }>;
  utmCampaignsData?: Array<{ campaign: string; clicks: number }>;
  utmTermsData?: Array<{ term: string; clicks: number }>;
  utmContentsData?: Array<{ content: string; clicks: number }>;
  isLoading?: boolean;
  error?: Error;
}

type PrimaryTab = "referrers" | "utm";

type UtmTab =
  | "utmSources"
  | "utmMediums"
  | "utmCampaigns"
  | "utmTerms"
  | "utmContents";

interface RowItem {
  label: string;
  clicks: number;
  avatarUrl?: string;
}

const UTM_TABS: Array<{ key: UtmTab; label: string; singular: string }> = [
  { key: "utmSources", label: "Source", singular: "Source" },
  { key: "utmMediums", label: "Medium", singular: "Medium" },
  { key: "utmCampaigns", label: "Campaign", singular: "Campaign" },
  { key: "utmTerms", label: "Term", singular: "Term" },
  { key: "utmContents", label: "Content", singular: "Content" },
];

function TableHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center border-b pb-2">
      <div className="flex-1 text-sm">{label}</div>
      <div className="min-w-[80px] text-right text-sm">Clicks</div>
    </div>
  );
}

function formatLabel(label: string): string {
  return label.replace(/^https?:\/\//, "").replace("www.", "");
}

function looksLikeUrl(value: string): boolean {
  return (
    value.includes(".") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

const ReferrerClicks = ({
  referrersData,
  utmSourcesData,
  utmMediumsData,
  utmCampaignsData,
  utmTermsData,
  utmContentsData,
  isLoading,
  error,
}: ReferrerClicksProps) => {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("referrers");
  const [utmTab, setUtmTab] = useState<UtmTab>("utmSources");
  const [dialogOpen, setDialogOpen] = useState(false);

  const processedData = useMemo((): RowItem[] => {
    if (primaryTab === "referrers") {
      return (referrersData ?? []).map((item) => ({
        label: item.referrer,
        clicks: item.clicks,
        avatarUrl: item.referrer,
      }));
    }

    switch (utmTab) {
      case "utmSources":
        return (utmSourcesData ?? []).map((item) => ({
          label: item.source,
          clicks: item.clicks,
          avatarUrl: looksLikeUrl(item.source) ? item.source : undefined,
        }));
      case "utmMediums":
        return (utmMediumsData ?? []).map((item) => ({
          label: item.medium,
          clicks: item.clicks,
        }));
      case "utmCampaigns":
        return (utmCampaignsData ?? []).map((item) => ({
          label: item.campaign,
          clicks: item.clicks,
        }));
      case "utmTerms":
        return (utmTermsData ?? []).map((item) => ({
          label: item.term,
          clicks: item.clicks,
        }));
      case "utmContents":
        return (utmContentsData ?? []).map((item) => ({
          label: item.content,
          clicks: item.clicks,
        }));
      default:
        return [];
    }
  }, [
    primaryTab,
    utmTab,
    referrersData,
    utmSourcesData,
    utmMediumsData,
    utmCampaignsData,
    utmTermsData,
    utmContentsData,
  ]);

  const sortedData = useMemo(
    () => [...processedData].sort((a, b) => b.clicks - a.clicks),
    [processedData],
  );

  const headerLabel =
    primaryTab === "referrers"
      ? "Source"
      : (UTM_TABS.find((tab) => tab.key === utmTab)?.singular ?? "Source");

  const dialogTitle =
    primaryTab === "referrers"
      ? "Referrers"
      : (UTM_TABS.find((tab) => tab.key === utmTab)?.label ?? "UTM");

  const keyPrefix = primaryTab === "referrers" ? "referrer" : utmTab;
  const useAvatar = primaryTab === "referrers" || utmTab === "utmSources";

  const NameComponent = useMemo<React.ComponentType<{ item: RowItem }>>(
    () =>
      function UtmName({ item }) {
        const showAvatar = useAvatar && Boolean(item.avatarUrl);
        return (
          <div className="flex items-center gap-x-2">
            {showAvatar ? (
              <UrlAvatar
                className="flex-shrink-0 rounded-sm"
                size={5}
                imgSize={4}
                url={item.avatarUrl!}
              />
            ) : null}
            <span className="line-clamp-1 max-w-[220px] text-ellipsis">
              {formatLabel(item.label)}
            </span>
          </div>
        );
      },
    [useAvatar],
  );

  return (
    <Card className="relative overflow-hidden border shadow-none">
      <CardContent className="pb-2">
        <Tabs
          value={primaryTab}
          onValueChange={(value) => setPrimaryTab(value as PrimaryTab)}
        >
          <div className="flex items-center gap-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="referrers">Referrers</TabsTrigger>
              <TabsTrigger value="utm">UTM Parameters</TabsTrigger>
            </TabsList>
          </div>

          {primaryTab === "utm" ? (
            <div className="bg-muted/40 mt-2 flex flex-wrap items-center gap-1 rounded-md border px-2 py-1.5">
              {UTM_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setUtmTab(tab.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-sm transition-colors",
                    utmTab === tab.key
                      ? "bg-background text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          <TabsContent value={primaryTab} className="mt-1 font-normal">
            <div
              className="relative h-72 w-full"
              role="list"
              aria-label={`Clicks by ${headerLabel.toLowerCase()}`}
            >
              {sortedData.length > 0 || isLoading ? (
                <TableHeader label={headerLabel} />
              ) : null}
              <TableCard
                data={sortedData.slice(0, 7)}
                loading={isLoading ?? false}
                error={error}
                keyPrefix={keyPrefix}
                dataKey="label"
                getClicks={(item) => item.clicks}
                getKey={(item, index) => item.label || `${keyPrefix}-${index}`}
                progressColor="bg-red-200/40"
                NameComponent={NameComponent}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {sortedData.length > 0 ? (
        <div className="absolute bottom-0 left-0 h-[50%] w-full bg-gradient-to-t from-white to-transparent" />
      ) : null}

      <AnalyticsDialog
        data={sortedData}
        loading={isLoading ?? false}
        error={error}
        keyPrefix={keyPrefix}
        dataKey="label"
        getClicks={(item) => item.clicks}
        getKey={(item, index) => item.label || `${keyPrefix}-${index}`}
        progressColor="bg-red-200/40"
        NameComponent={NameComponent}
        title={dialogTitle}
        headerLabel={headerLabel}
        showButton={!(isLoading ?? false) && sortedData.length > 7}
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
      />
    </Card>
  );
};

export default ReferrerClicks;
