"use client";

import { memo } from "react";
import { UsageStatsClient } from "./usage-stats-client";
import useSWR from "swr";

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

const EMPTY_DATA: UsageData = { workspace: null, usage: null };
const UsageStats = memo(function UsageStats({
  workspaceslug,
}: {
  workspaceslug: string;
}) {
  const { data = EMPTY_DATA, error } = useSWR<UsageData>(
    `/api/workspace/${workspaceslug}/usages`,
  );

  if (error) {
    console.error("Failed to fetch usage data:", error);
  }

  return <UsageStatsClient workspace={data.workspace} usage={data.usage} />;
});

UsageStats.displayName = "UsageStats";

export default UsageStats;
