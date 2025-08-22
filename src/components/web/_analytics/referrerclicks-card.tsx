"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UrlAvatar from "@/components/web/url-avatar";
import useSWR from "swr";
// Function to fetch referrer data from the API route
const fetchReferrerData = async (
  workspaceslug: string,
  params: Record<string, string>
) => {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/workspace/${workspaceslug}/analytics?${searchParams}&metrics=referrers`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch referrer data: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.referrers ?? [];
};
import TableCard from "./table-card";
import AnalyticsDialog from "./analytics-dialog";

interface ReferrerClicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
}

interface ReferrerData {
  referrer: string;
  clicks: number;
}

type ProcessedReferrerData = ReferrerData & { safeKey: string };

interface TabConfig {
  key: "referrers";
  label: string;
  singular: string;
  renderName: (item: ReferrerData) => JSX.Element;
}

function TableHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center border-b pb-2">
      <div className="flex-1 text-sm">{label}</div>
      <div className="min-w-[80px] text-right text-sm">Clicks</div>
    </div>
  );
}

const tabConfigs: TabConfig[] = [
  {
    key: "referrers",
    label: "Referrers",
    singular: "Source",
    renderName: (item) => (
      <div className="flex items-center gap-x-2">
        <UrlAvatar
          className="flex-shrink-0 rounded-sm"
          size={5}
          imgSize={4}
          url={item.referrer}
        />
        <span className="line-clamp-1 max-w-[220px] text-ellipsis">
          {item.referrer.replace(/^https?:\/\//, "").replace("www.", "")}
        </span>
      </div>
    ),
  },
];

const ReferrerClicks = ({
  workspaceslug,
  searchParams,
}: ReferrerClicksProps) => {
  const [activeTab, setActiveTab] = useState<TabConfig["key"]>("referrers");
  const [cache, setCache] = useState<Record<string, ReferrerData[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  const swrKey = ["referrers", workspaceslug, activeTab, searchParams];
  const { data, error, isLoading } = useSWR<ReferrerData[], Error>(
    swrKey,
    () => fetchReferrerData(workspaceslug, searchParams),
    {
      onSuccess: (newData) => {
        setCache((prev) => ({ ...prev, [activeTab]: newData }));
      },
    },
  );

  const displayedData = cache[activeTab] ?? data ?? [];

  const sortedData = useMemo(
    () => [...displayedData].sort((a, b) => b.clicks - a.clicks),
    [displayedData],
  );

  const processedData: ProcessedReferrerData[] = useMemo(
    () =>
      sortedData.map((item) => ({
        ...item,
        safeKey: item.referrer
          .replace(/^https?:\/\//, "")
          .replace(/[^\w]/g, "-"),
      })),
    [sortedData],
  );

  const currentTabConfig = tabConfigs.find((tab) => tab.key === activeTab)!;



  return (
    <Card className="relative overflow-hidden border shadow-none">
      <CardContent className="pb-2">
        <Tabs
          defaultValue="referrers"
          onValueChange={(value) => setActiveTab(value as TabConfig["key"])}
        >
          <TabsList className="grid w-full grid-cols-2">
            {tabConfigs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent
            value={currentTabConfig.key}
            className="mt-1 font-normal"
          >
            <div
              className="relative h-72 w-full"
              role="list"
              aria-label={`Clicks by ${currentTabConfig.label.toLowerCase()}`}
            >
              <TableHeader label={currentTabConfig.singular} />
              <TableCard
                data={processedData.slice(0, 7)}
                loading={isLoading}
                error={error}
                keyPrefix="referrer"
                getClicks={(item) => item.clicks}
                getKey={(item, index) => item.safeKey ?? `referrer-${index}`}
                progressColor="bg-red-200/40"
                renderName={(item) => currentTabConfig.renderName(item)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <div className="absolute bottom-0 left-0 h-[50%] w-full bg-gradient-to-t from-white to-transparent"></div>

      <AnalyticsDialog
        data={processedData}
        loading={isLoading}
        error={error}
        keyPrefix="referrer"
        getClicks={(item) => item.clicks}
        getKey={(item, index) => item.safeKey ?? `referrer-${index}`}
        progressColor="bg-red-200/40"
        renderName={(item) => currentTabConfig.renderName(item)}
        title={currentTabConfig.label}
        headerLabel={currentTabConfig.singular}
        showButton={!isLoading && processedData.length > 7}
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
      />
    </Card>
  );
};

export default ReferrerClicks;
