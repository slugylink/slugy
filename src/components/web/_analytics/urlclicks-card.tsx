"use client";
import React, { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import UrlAvatar from "@/components/web/url-avatar";
import useSWR from "swr";
import { fetchUrlClicksData } from "@/server/actions/analytics/use-analytics";
import TableCard from "./table-card";

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

// ----------------------- Main Component -----------------------
const UrlClicks = ({ workspaceslug, searchParams }: UrlClicksProps) => {
  const { data, error, isLoading } = useSWR<UrlClickData[], Error>(
    ["url-clicks", workspaceslug, searchParams],
    () => fetchUrlClicksData(workspaceslug, searchParams),
  );

  const sortedData = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.clicks - a.clicks),
    [data],
  );

  const [activeTab, setActiveTab] = useState<TabKey>("slug-links");

  if (error) {
    return (
      <Card className="border shadow-none">
        <CardHeader className="pb-2">
          <div className="text-destructive">Error loading URL clicks data</div>
        </CardHeader>
      </Card>
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

  return (
    <Card className="border shadow-none">
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

          {tabConfigs.map((tab) => (
            <TabsContent value={tab.key} key={tab.key} className="mt-1">
              <ScrollArea
                className="h-72 w-full"
                role="list"
                aria-label={`${tab.label} click data`}
              >
                <div>
                  <TableHeader linkLabel={tab.linkLabel} />
                  <TableCard
                    data={sortedData}
                    loading={isLoading}
                    error={error}
                    keyPrefix={tab.keyPrefix}
                    getClicks={(item) => item.clicks}
                    getKey={(item, index) =>
                      item.slug ?? item.url ?? `${tab.keyPrefix}-${index}`
                    }
                    progressColor={tab.progressColor}
                    renderName={tab.renderName}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardHeader>
    </Card>
  );
};

export default UrlClicks;
