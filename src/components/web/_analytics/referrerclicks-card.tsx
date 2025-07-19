"use client";
import React, { useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import UrlAvatar from "@/components/web/url-avatar";
import { formatNumber } from "@/lib/format-number";
import useSWR from "swr";
import { fetchReferrerData } from "@/server/actions/analytics/use-analytics";
import { LoaderCircle } from "@/utils/icons/loader-circle";

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-72">
                        <div className="flex h-full items-center justify-center">
                          <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {processedData.map((item) => {
                        const maxClicks = processedData[0]?.clicks ?? 1;
                        const widthPercentage = (item.clicks / maxClicks) * 100;
                        return (
                          <TableRow
                            key={`referrer-${item.safeKey}`}
                            className="bg-background relative border-none"
                          >
                            <TableCell className="relative z-10 flex items-center gap-x-2">
                              <UrlAvatar
                                className="rounded-sm"
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
                            </TableCell>
                            <TableCell className="relative z-10 text-right">
                              {formatNumber(item.clicks)}
                            </TableCell>
                            <div
                              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-red-200/40 dark:bg-red-950/50"
                              style={{ width: `${widthPercentage}%` }}
                            />
                          </TableRow>
                        );
                      })}
                      {(processedData.length === 0 || error) && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-4 text-center text-gray-500"
                          >
                            No referrer data available
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};

export default ReferrerClicks;
