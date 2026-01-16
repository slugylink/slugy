"use client";

import { useEffect, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Link2, ChevronRight, MousePointerClick } from "lucide-react";
import { formatNumber } from "@/lib/format-number";

type Workspace = {
  maxClicksLimit: number;
  maxLinksLimit: number;
};

type Usage = {
  clicksTracked: number;
  linksCreated: number;
  periodEnd: Date | string;
  periodStart?: Date | string;
};

type UsageStatsClientProps = {
  workspace: Workspace | null;
  usage: Usage | null;
};

const calculateProgress = (used: number, limit: number) =>
  limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

function EmptyUsageCard() {
  return (
    <Card className="w-full max-w-xs p-3.5 shadow-sm">
      <div className="text-muted-foreground flex items-center text-sm">
        Usage <ChevronRight className="ml-1 h-3 w-3" />
      </div>

      <div className="space-y-3">
        <UsageProgressRow
          icon={<MousePointerClick className="text-muted-foreground h-3 w-3" />}
          label="Events"
          used={0}
          limit={0}
          progress={0}
        />
        <UsageProgressRow
          icon={<Link2 className="text-muted-foreground h-3 w-3" />}
          label="Links"
          used={0}
          limit={0}
          progress={0}
        />
      </div>

      <p className="text-muted-foreground mt-2 text-xs">Usage will reset —</p>
    </Card>
  );
}

export function UsageStatsClient({ workspace, usage }: UsageStatsClientProps) {
  if (!workspace || !usage) return <EmptyUsageCard />;

  const { clicksTracked, linksCreated, periodEnd } = usage;
  const { maxClicksLimit, maxLinksLimit } = workspace;

  const clicksProgress = calculateProgress(clicksTracked, maxClicksLimit);
  const linksProgress = calculateProgress(linksCreated, maxLinksLimit);

  const usageResetDate = new Date(periodEnd).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="w-full max-w-xs p-3.5 shadow-sm">
      <div className="text-muted-foreground flex items-center text-sm">
        Usage <ChevronRight className="ml-1 h-3 w-3" />
      </div>

      <div className="space-y-3">
        <UsageProgressRow
          icon={<MousePointerClick className="text-muted-foreground h-3 w-3" />}
          label="Events"
          used={clicksTracked}
          limit={maxClicksLimit}
          progress={clicksProgress}
        />
        <UsageProgressRow
          icon={<Link2 className="text-muted-foreground h-3 w-3" />}
          label="Links"
          used={linksCreated}
          limit={maxLinksLimit}
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
  icon: ReactNode;
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
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  });
  const width = useTransform(springValue, (value) => `${value}%`);

  useEffect(() => {
    motionValue.set(progress);
  }, [progress, motionValue]);

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
      <div className="bg-primary/20 relative h-[2px] w-full overflow-hidden rounded-full">
        <motion.div
          className="bg-orange-500 h-full"
          style={{ width: width }}
        />
      </div>
    </div>
  );
}
