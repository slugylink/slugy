"use client";

import { useEffect, useState, memo, useRef } from "react";
import { UsageStatsClient } from "./usage-stats-client";

type WorkspaceData = {
  maxClicksLimit: number;
  maxLinksLimit: number;
  maxUsers: number;
};

type UsageDetails = {
  clicksTracked: number;
  linksCreated: number;
  addedUsers: number;
  periodStart: Date | string;
  periodEnd: Date | string;
};

type UsageData = {
  workspace: WorkspaceData | null;
  usage: UsageDetails | null;
};

const usageCache = new Map<string, UsageData>();
const EMPTY_DATA: UsageData = { workspace: null, usage: null };

const UsageStats = memo(function UsageStats({
  workspaceslug,
}: {
  workspaceslug: string;
}) {
  const cachedData = usageCache.get(workspaceslug);
  const [data, setData] = useState<UsageData>(cachedData ?? EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const fetchingRef = useRef<string | null>(null);

  useEffect(() => {
    const cached = usageCache.get(workspaceslug);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      return;
    }

    if (fetchingRef.current === workspaceslug) {
      return;
    }

    fetchingRef.current = workspaceslug;
    setIsLoading(true);

    const fetchUsages = async () => {
      try {
        const response = await fetch(
          `/api/workspace/${workspaceslug}/usages`,
        );
        const result: UsageData = response.ok
          ? await response.json()
          : EMPTY_DATA;

        usageCache.set(workspaceslug, result);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch usage data:", error);
        usageCache.set(workspaceslug, EMPTY_DATA);
        setData(EMPTY_DATA);
      } finally {
        setIsLoading(false);
        fetchingRef.current = null;
      }
    };

    void fetchUsages();
  }, [workspaceslug]);

  return (
    <UsageStatsClient
      workspace={data.workspace}
      usage={data.usage}
    />
  );
});

UsageStats.displayName = "UsageStats";

export default UsageStats;
