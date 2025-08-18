"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link2, ChevronRight, MousePointerClick } from "lucide-react";
import { formatNumber } from "@/lib/format-number";

type Workspace = {
  maxClicksLimit: number;
  maxLinksLimit: number;
  storageLimitMb?: number;
  maxUsers: number;
};

type Usage = {
  clicksTracked: number;
  linksCreated: number;
  storageUsedMb?: number;
  addedUsers: number;
  periodEnd: Date;
};

type UsageStatsClientProps = {
  workspace: Workspace | null;
  usage: Usage | null;
};

export function UsageStatsClient({ workspace, usage }: UsageStatsClientProps) {
  if (!workspace || !usage) {
    return (
      <Card className="w-full max-w-xs space-y-4 p-3.5 shadow-sm">
        <p className="text-muted-foreground text-sm">
          Usage data not available.
        </p>
      </Card>
    );
  }

  const calculateProgress = (used: number, limit: number) =>
    Math.min((used / limit) * 100, 100);

  const clicksProgress = calculateProgress(
    usage.clicksTracked,
    workspace.maxClicksLimit,
  );
  const linksProgress = calculateProgress(
    usage.linksCreated,
    workspace.maxLinksLimit,
  );

  const usageResetDate = new Date(usage.periodEnd).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <Card className="w-full max-w-xs p-3.5 shadow-sm">
      <div className="text-muted-foreground flex items-center text-sm">
        Usage <ChevronRight className="ml-1 h-3 w-3" />
      </div>

      <div className="space-y-3">
        {/* Click Events */}
        <UsageProgressRow
          icon={<MousePointerClick className="text-muted-foreground h-3 w-3" />}
          label="Click Events"
          used={usage.clicksTracked}
          limit={workspace.maxClicksLimit}
          progress={clicksProgress}
        />

        {/* Links */}
        <UsageProgressRow
          icon={<Link2 className="text-muted-foreground h-3 w-3" />}
          label="Links"
          used={usage.linksCreated}
          limit={workspace.maxLinksLimit}
          progress={linksProgress}
        />
      </div>

      <p className="text-muted-foreground mt-2 text-xs">
        Usage will reset {usageResetDate}
      </p>
    </Card>
  );
}

type UsageProgressRowProps = {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
  progress: number;
};

function UsageProgressRow({
  icon,
  label,
  used,
  limit,
  progress,
}: UsageProgressRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-muted-foreground text-xs">{label}</span>
        </div>
        <span className="text-xs">
          {formatNumber(used)} of {formatNumber(limit)}
        </span>
      </div>
      <Progress value={progress} className="h-[2px]" />
    </div>
  );
}
