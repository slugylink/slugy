"use client";
import React, { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import UrlAvatar from "@/components/web/url-avatar";
import useSWR from "swr";
import { fetchUrlClicksData } from "@/server/actions/analytics/use-analytics";
import TableCard from "./table-card";

interface UrlClicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
}

interface UrlClickData {
  slug: string;
  url: string;
  clicks: number;
}

// Reusable header component for table column titles
function TableHeader({ linkLabel }: { linkLabel: string }) {
  return (
    <div className="mb-2 flex items-center border-b pb-2">
      <div className="flex-1 text-sm">{linkLabel}</div>
      <div className="min-w-[80px] text-right text-sm">Clicks</div>
    </div>
  );
}

const UrlClicks = ({ workspaceslug, searchParams }: UrlClicksProps) => {
  const { data, error, isLoading } = useSWR<UrlClickData[], Error>(
    ["url-clicks", workspaceslug, searchParams],
    () => fetchUrlClicksData(workspaceslug, searchParams),
  );

  // Sort descending by clicks
  const sortedData = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.clicks - a.clicks),
    [data],
  );

  const [activeTab, setActiveTab] = useState<
    "short-links" | "destination-links"
  >("short-links");

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
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="short-links">Short Links</TabsTrigger>
            <TabsTrigger value="destination-links">
              Destination URLs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="short-links" className="mt-1">
            <ScrollArea
              className="h-72 w-full"
              role="list"
              aria-label="Short Links click data"
            >
              <div>
                <TableHeader linkLabel="Link" />
                <TableCard
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="short"
                  getClicks={(item) => item.clicks}
                  getKey={(item, index) =>
                    item.slug ?? item.url ?? `short-${index}`
                  }
                  progressColor="bg-orange-200/40"
                  renderName={(item) => (
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
                  )}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="destination-links" className="mt-1">
            <ScrollArea
              className="h-72 w-full"
              role="list"
              aria-label="Destination URLs click data"
            >
              <div>
                <TableHeader linkLabel="URL" />
                <TableCard
                  data={sortedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="dest"
                  getClicks={(item) => item.clicks}
                  getKey={(item, index) =>
                    item.slug ?? item.url ?? `dest-${index}`
                  }
                  progressColor="bg-orange-200/45"
                  renderName={(item) => (
                    <div className="flex items-center gap-x-2">
                      <UrlAvatar
                        className="flex-shrink-0 rounded-sm"
                        size={5}
                        imgSize={4}
                        url={item.url}
                      />
                      <span className="line-clamp-1 max-w-[220px] text-ellipsis">
                        {item.url
                          .replace("https://", "")
                          .replace("http://", "")
                          .replace("www.", "")}
                      </span>
                    </div>
                  )}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};

export default UrlClicks;
