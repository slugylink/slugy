"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link2, ChevronRight, MousePointerClick } from "lucide-react";
import { formatNumber } from "@/lib/format-number";

type UsageStatsClientProps = {
  workspace: {
    maxClicksLimit: number;
    maxLinksLimit: number;
    storageLimitMb?: number;
    maxUsers: number;
  } | null;
  usage: {
    clicksTracked: number;
    linksCreated: number;
    storageUsedMb?: number;
    addedUsers: number;
    periodEnd: Date;
  } | null;
};

export function UsageStatsClient({ workspace, usage }: UsageStatsClientProps) {
  if (!workspace || !usage) {
    return (
      <Card className="w-full max-w-xs space-y-4 p-3.5 shadow-sm">
        <div className="text-muted-foreground text-sm">
          Usage data not available.
        </div>
      </Card>
    );
  }

  const clicksProgress = Math.min(
    (usage.clicksTracked / workspace.maxClicksLimit) * 100,
    100,
  );
  const linksProgress = Math.min(
    (usage.linksCreated / workspace.maxLinksLimit) * 100,
    100,
  );
  const usageResetDate = new Date(usage.periodEnd).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="w-full max-w-xs p-3.5 shadow-sm">
      <div className="text-muted-foreground flex items-center text-sm">
        Usage <ChevronRight className="ml-1 h-3 w-3" />
      </div>
      <div className="space-y-3">
        {/* Events */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MousePointerClick className="text-muted-foreground h-3 w-3" />
              <span className="text-muted-foreground text-xs">
                Click Events
              </span>
            </div>
            <span className="text-xs">
              {formatNumber(usage.clicksTracked)} of{" "}
              {formatNumber(workspace.maxClicksLimit)}
            </span>
          </div>
          <Progress value={clicksProgress} className="h-[2px]" />
        </div>
        {/* Links */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="text-muted-foreground h-3 w-3" />
              <span className="text-muted-foreground text-xs">Links</span>
            </div>
            <span className="text-xs">
              {formatNumber(usage.linksCreated)} of{" "}
              {formatNumber(workspace.maxLinksLimit)}
            </span>
          </div>
          <Progress value={linksProgress} className="h-[2px]" />
        </div>
      </div>
      <div className="text-muted-foreground text-xs">
        Usage will reset {usageResetDate}
      </div>
    </Card>
  );
} 