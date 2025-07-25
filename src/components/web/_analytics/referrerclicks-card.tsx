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

interface RefTableProps<T> {
  data: T[];
  loading: boolean;
  error?: Error;
  keyPrefix: string;
  renderName: (item: T) => React.ReactNode;
}

function RefTable<T extends ReferrerData>({
  data,
  loading,
  error,
  keyPrefix,
  renderName,
}: RefTableProps<T>) {
  const maxClicks = data[0]?.clicks ?? 1;

  if (loading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={2} className="h-60 py-4 text-center text-gray-500">
            <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin mx-auto" />
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (error || data.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={2} className="h-60 py-4 text-center text-gray-500">
            No data available
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody className="space-y-1">
      {data.map((item, index) => {
        const widthPercentage = (item.clicks / maxClicks) * 100;
        const keyId = item.referrer ?? `${keyPrefix}-${index}`;
        return (
          <TableRow
            key={`${keyPrefix}-${keyId}`}
            className="bg-background relative border-none"
          >
            <TableCell className="relative z-10 flex items-center gap-x-2">
              {renderName(item)}
            </TableCell>
            <TableCell className="relative z-10 text-right">
              {formatNumber(item.clicks)}
            </TableCell>
            <div
              className="absolute inset-y-0 left-0 my-auto h-[85%] rounded-md bg-red-200/40 dark:bg-red-950/50"
              style={{ width: `${widthPercentage}%` }}
              aria-hidden="true"
            />
          </TableRow>
        );
      })}
    </TableBody>
  );
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
                <RefTable
                  data={processedData}
                  loading={isLoading}
                  error={error}
                  keyPrefix="referrer"
                  renderName={(item) => (
                    <>
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
                    </>
                  )}
                />
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};

export default ReferrerClicks;
