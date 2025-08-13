"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import UrlAvatar from "@/components/web/url-avatar";
import useSWR from "swr";
import { fetchReferrerData } from "@/server/actions/analytics/use-analytics";
import TableCard from "./table-card";
import { Scan } from "lucide-react";
import { Button } from "@/components/ui/button";

// --------------------------------------------------
// Types
// --------------------------------------------------
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

// --------------------------------------------------
// Helper Components
// --------------------------------------------------
function TableHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center border-b pb-2">
      <div className="flex-1 text-sm">{label}</div>
      <div className="min-w-[80px] text-right text-sm">Clicks</div>
    </div>
  );
}

// --------------------------------------------------
// Static Data
// --------------------------------------------------
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

// --------------------------------------------------
// Main Component
// --------------------------------------------------
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

  const renderTable = (rows: ProcessedReferrerData[], keySuffix = "") => (
    <TableCard
      data={rows}
      loading={isLoading}
      error={error}
      keyPrefix={`referrer${keySuffix}`}
      getClicks={(item) => item.clicks}
      getKey={(item, index) => item.safeKey ?? `referrer-${keySuffix}${index}`}
      progressColor="bg-red-200/40"
      renderName={(item) => currentTabConfig.renderName(item)}
    />
  );

  return (
    <Card className="relative overflow-hidden border shadow-none">
      <CardContent className="pb-2">
        <Tabs
          defaultValue="referrers"
          onValueChange={(value) => setActiveTab(value as TabConfig["key"])}
        >
          {/* Tab buttons */}
          <TabsList className="grid w-full grid-cols-2">
            {tabConfigs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab panel */}
          <TabsContent
            value={currentTabConfig.key}
            className="mt-1 font-normal"
          >
            <ScrollArea
              className="relative h-72 w-full"
              role="list"
              aria-label={`Clicks by ${currentTabConfig.label.toLowerCase()}`}
            >
              <TableHeader label={currentTabConfig.singular} />
              {renderTable(processedData.slice(0, 7))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      <div className="absolute bottom-0 left-0 h-[50%] w-full bg-gradient-to-t from-white to-transparent"></div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            {!isLoading || data?.length && (
              <Button size={"xs"} variant={"secondary"}>
                <Scan className="mr-1 h-3 w-3" /> View All
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-xl overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {currentTabConfig.label}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <TableHeader label={currentTabConfig.singular} />
              <ScrollArea className="h-[60vh] w-full">
                {renderTable(processedData, "dialog-")}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
};

export default ReferrerClicks;
