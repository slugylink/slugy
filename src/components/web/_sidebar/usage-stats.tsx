"use client";

import { memo } from "react";
import useSWR from "swr";
import { UsageStatsClient } from "./usage-stats-client";

// ============================================================================
// Types
// ============================================================================

interface WorkspaceData {
  maxClicksLimit: number;
  maxLinksLimit: number;
  maxUsers: number;
}

interface UsageDetails {
  clicksTracked: number;
  linksCreated: number;
  addedUsers: number;
  periodStart: Date | string;
  periodEnd: Date | string;
}

interface UsageData {
  workspace: WorkspaceData | null;
  usage: UsageDetails | null;
}

interface UsageStatsProps {
  workspaceslug: string;
}

// ============================================================================
// Constants
// ============================================================================

const EMPTY_DATA: UsageData = {
  workspace: null,
  usage: null,
};

// ============================================================================
// Main Component
// ============================================================================

const UsageStats = memo(function UsageStats({
  workspaceslug,
}: UsageStatsProps) {
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
