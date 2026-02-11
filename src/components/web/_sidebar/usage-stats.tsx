"use client";

import { memo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { UsageStatsClient } from "./usage-stats-client";
import { Button } from "@/components/ui/button";

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
  isActivePro: boolean;
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
  isActivePro: false,
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

  const { workspace, usage, isActivePro } = data;

  return (
    <>
      {!isActivePro && (
        <Link
          href={`/${workspaceslug}/settings/billing`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="secondary" className="w-full rounded-lg">
            <Sparkles className="mr-2" />
            Upgrade to Pro
          </Button>
        </Link>
      )}
      <UsageStatsClient
        isActivePro={isActivePro}
        workspace={workspace}
        usage={usage}
      />
    </>
  );
});

UsageStats.displayName = "UsageStats";

export default UsageStats;
