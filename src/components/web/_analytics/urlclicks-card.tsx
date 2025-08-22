"use client";
import React, { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UrlAvatar from "@/components/web/url-avatar";
import useSWR from "swr";
// Function to fetch URL clicks data from the API route
const fetchUrlClicksData = async (
  workspaceslug: string,
  params: Record<string, string>
) => {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/workspace/${workspaceslug}/analytics?${searchParams}&metrics=links`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch URL clicks data: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.links ?? [];
};
import TableCard from "./table-card";
import AnalyticsDialog from "./analytics-dialog";

// ----------------------- Types -----------------------
interface UrlClicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
}

interface UrlClickData {
  slug: string;
  url: string;
  clicks: number;
}

type TabKey = "slug-links" | "destination-links";

interface TabConfig {
  key: TabKey;
  label: string; // used for tab label
  linkLabel: string; // used for TableHeader
  keyPrefix: string;
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
    keyPrefix: "slug",
    progressColor: "bg-orange-200/40",
    renderName: (item) => (
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
    ),
  },
  {
    key: "destination-links",
    label: "Destination URLs",
    linkLabel: "URL",
    keyPrefix: "destination",
    progressColor: "bg-orange-200/45",
    renderName: (item) => (
      <div className="flex items-center gap-x-2">
        <UrlAvatar
          className="flex-shrink-0 rounded-sm"
          size={5}
          imgSize={4}
          url={item.url}
        />
        <span className="line-clamp-1 max-w-[220px] text-ellipsis">
          {item.url.replace(/^https?:\/\//, "").replace(/^www\./, "")}
        </span>
      </div>
    ),
  },
];

// ----------------------- Main Component -----------------------
const UrlClicks = ({ workspaceslug, searchParams }: UrlClicksProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("slug-links");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, error, isLoading } = useSWR<UrlClickData[], Error>(
    ["url-clicks", workspaceslug, searchParams],
    () => fetchUrlClicksData(workspaceslug, searchParams),
  );

  const sortedData = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.clicks - a.clicks),
    [data],
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
                loading={isLoading}
                error={error}
                keyPrefix={currentTabConfig.keyPrefix}
                getClicks={(item) => item.clicks}
                getKey={(item, index) =>
                  item.slug ?? item.url ?? `${currentTabConfig.keyPrefix}-${index}`
                }
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
        loading={isLoading}
        error={error}
        keyPrefix={currentTabConfig.keyPrefix}
        getClicks={(item) => item.clicks}
        getKey={(item, index) =>
          item.slug ?? item.url ?? `${currentTabConfig.keyPrefix}-${index}`
        }
        progressColor={currentTabConfig.progressColor}
        renderName={currentTabConfig.renderName}
        title={currentTabConfig.label}
        headerLabel={currentTabConfig.linkLabel}
        showButton={!isLoading && sortedData.length > 7}
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
      />
    </Card>
  );
};

export default UrlClicks;
