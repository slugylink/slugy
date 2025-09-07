"use client";
import React, { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UrlAvatar from "@/components/web/url-avatar";
import TableCard from "./table-card";
import AnalyticsDialog from "./analytics-dialog";

// ----------------------- Types -----------------------
interface UrlClicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
  timePeriod: "24h" | "7d" | "30d" | "3m" | "12m" | "all";
  // New props to accept data directly
  linksData?: Array<{ slug: string; url: string; clicks: number }>;
  destinationsData?: Array<{ destination: string; clicks: number }>;
  isLoading?: boolean;
  error?: Error;
}

// Union type to handle both data structures
type UrlClickData =
  | { slug: string; url: string; clicks: number }
  | { destination: string; clicks: number };

type TabKey = "slug-links" | "destination-links";

interface TabConfig {
  key: TabKey;
  label: string; // used for tab label
  linkLabel: string; // used for TableHeader
  dataKey: string;
  progressColor: string;
  renderName: (item: UrlClickData) => JSX.Element;
}

// ----------------------- TableHeader -----------------------
function TableHeader({ linkLabel }: { linkLabel: string }) {
  return (
    <div className="mb-2 flex items-center border-b pb-2">
      <div className="flex-1 text-sm">{linkLabel}</div>
      <div className="min-w-[80px] text-right text-sm">Clicks</div>
    </div>
  );
}

// ------------------- Centralized tab configs -------------------
const tabConfigs: TabConfig[] = [
  {
    key: "slug-links",
    label: "Short Links",
    linkLabel: "Link",
    dataKey: "slug",
    progressColor: "bg-orange-200/40",
    renderName: (item) => {
      // Type guard to check if item has slug and url
      if ("slug" in item && "url" in item) {
        return (
          <div className="flex items-center gap-x-2">
            <UrlAvatar
              className="flex-shrink-0 rounded-sm"
              size={5}
              imgSize={4}
              url={item.url}
            />
            <span className="line-clamp-1 max-w-[220px] cursor-pointer text-ellipsis">
              slugy.co/{item.slug}
            </span>
          </div>
        );
      }
      return <span>Invalid data</span>;
    },
  },
  {
    key: "destination-links",
    label: "Destination URLs",
    linkLabel: "URL",
    dataKey: "destination",
    progressColor: "bg-orange-200/45",
    renderName: (item) => {
      // Type guard to check if item has destination
      if ("destination" in item) {
        return (
          <div className="flex items-center gap-x-2">
            <UrlAvatar
              className="flex-shrink-0 rounded-sm"
              size={5}
              imgSize={4}
              url={item.destination}
            />
            <span className="line-clamp-1 max-w-[220px] text-ellipsis">
              {item.destination
                .replace(/^https?:\/\//, "")
                .replace(/^www\./, "")}
            </span>
          </div>
        );
      }
      return <span>Invalid data</span>;
    },
  },
];

// ----------------------- Main Component -----------------------
const UrlClicks = ({
  linksData,
  destinationsData,
  isLoading,
  error,
}: UrlClicksProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("slug-links");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get data based on active tab with proper typing
  const currentData = useMemo((): UrlClickData[] => {
    switch (activeTab) {
      case "slug-links":
        return linksData as UrlClickData[];
      case "destination-links":
        return destinationsData as UrlClickData[];
      default:
        return [];
    }
  }, [activeTab, linksData, destinationsData]);

  const sortedData = useMemo(
    () => [...currentData].sort((a, b) => b.clicks - a.clicks),
    [currentData],
  );

  const currentTabConfig = tabConfigs.find((tab) => tab.key === activeTab)!;

  if (error) {
    return (
      <Card className="border shadow-none">
        <CardHeader className="pb-2">
          <div className="text-destructive">Error loading URL clicks data</div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border shadow-none">
      <CardHeader className="pb-2">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabKey)}
        >
          <TabsList className="grid w-full grid-cols-2">
            {tabConfigs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={currentTabConfig.key} className="mt-1">
            <div
              className="relative h-72 w-full"
              role="list"
              aria-label={`${currentTabConfig.label} click data`}
            >
              <TableHeader linkLabel={currentTabConfig.linkLabel} />
              <TableCard
                data={sortedData.slice(0, 7)}
                loading={isLoading ?? false}
                error={error}
                keyPrefix={currentTabConfig.dataKey}
                dataKey={currentTabConfig.dataKey}
                getClicks={(item) => item.clicks}
                getKey={(item, index) => {
                  if ("slug" in item) return item.slug;
                  if ("destination" in item) return item.destination;
                  return `${currentTabConfig.dataKey}-${index}`;
                }}
                progressColor={currentTabConfig.progressColor}
                renderName={currentTabConfig.renderName}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>

      <div className="absolute bottom-0 left-0 h-[50%] w-full bg-gradient-to-t from-white to-transparent"></div>

      <AnalyticsDialog
        data={sortedData}
        loading={isLoading ?? false}
        error={error}
        keyPrefix={currentTabConfig.dataKey}
        dataKey={currentTabConfig.dataKey}
        getClicks={(item) => item.clicks}
        getKey={(item, index) => {
          if ("slug" in item) return item.slug;
          if ("destination" in item) return item.destination;
          return `${currentTabConfig.dataKey}-${index}`;
        }}
        progressColor={currentTabConfig.progressColor}
        renderName={currentTabConfig.renderName}
        title={currentTabConfig.label}
        headerLabel={currentTabConfig.linkLabel}
        showButton={!(isLoading ?? false) && sortedData.length > 7}
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
      />
    </Card>
  );
};

export default UrlClicks;
