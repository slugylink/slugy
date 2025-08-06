"use client";
import React, { useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import UrlAvatar from "@/components/web/url-avatar";
import useSWR from "swr";
import { fetchReferrerData } from "@/server/actions/analytics/use-analytics";
import TableCard from "./table-card";

interface ReferrerClicksProps {
  workspaceslug: string;
  searchParams: Record<string, string>;
}

interface ReferrerData {
  referrer: string;
  clicks: number;
}

const ReferrerClicks = ({
  workspaceslug,
  searchParams,
}: ReferrerClicksProps) => {
  const { data, error, isLoading } = useSWR<ReferrerData[], Error>(
    ["referrers", workspaceslug, searchParams],
    () => fetchReferrerData(workspaceslug, searchParams),
  );

  // Pre-sort data by clicks (descending) for better user experience
  const sortedData = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.clicks - a.clicks),
    [data],
  );

  // Process URLs to create unique keys
  const processedData = useMemo(
    () =>
      sortedData.map((item) => ({
        ...item,
        // Create a safe key by removing protocol and special characters
        safeKey: item.referrer
          .replace(/^https?:\/\//, "")
          .replace(/[^\w]/g, "-"),
      })),
    [sortedData],
  );

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <Tabs defaultValue="referrers">
          <TabsList className="grid w-full grid-cols-2 gap-1">
            <TabsTrigger value="referrers">Referrers</TabsTrigger>
            <TabsTrigger value="x"></TabsTrigger>
          </TabsList>

          <TabsContent value="referrers" className="mt-1">
            <ScrollArea className="h-72 w-full">
              <div>
                {/* Header */}
                <div className="flex items-center border-b pb-2 mb-2">
                  <div className="flex-1 text-sm">Source</div>
                  <div className="text-right text-sm min-w-[80px]">Clicks</div>
                </div>
                {/* Content */}
                <TableCard
                  data={processedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="referrer"
                  getClicks={(item) => item.clicks}
                  getKey={(item, index) => item.safeKey ?? `referrer-${index}`}
                  progressColor="bg-red-200/40"
                  renderName={(item) => (
                    <div className="flex items-center gap-x-2">
                      <UrlAvatar
                        className="rounded-sm flex-shrink-0"
                        size={5}
                        imgSize={4}
                        url={item.referrer}
                      />
                      <span className="line-clamp-1 max-w-[220px] text-ellipsis">
                        {item.referrer
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

export default ReferrerClicks;
