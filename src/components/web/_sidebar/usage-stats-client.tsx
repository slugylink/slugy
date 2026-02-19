"use client";

import { useEffect, type ReactNode } from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Card } from "@/components/ui/card";
import { Link2, ChevronRight, MousePointerClick } from "lucide-react";
import { formatNumber } from "@/lib/format-number";
import Link from "next/link";
import { IoIosArrowRoundUp } from "react-icons/io";

// ============================================================================
// Types
// ============================================================================

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

interface UsageStatsClientProps {
  isActivePro: boolean;
  workspace: Workspace | null;
  usage: Usage | null;
  workspaceslug: string;
}

interface UsageProgressRowProps {
  icon: ReactNode;
  label: string;
  used: number;
  limit: number;
  progress: number;
}

// ============================================================================
// Constants
// ============================================================================

const ICON_PROPS = {
  className: "text-muted-foreground h-3 w-3",
} as const;

const SPRING_CONFIG = {
  stiffness: 100,
  damping: 20,
  mass: 0.5,
} as const;

// ============================================================================
// Utilities
// ============================================================================

function calculateProgress(used: number, limit: number): number {
  return limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
}

function formatResetDate(periodEnd: Date | string): string {
  return new Date(periodEnd).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

function UsageProgressRow({
  icon,
  label,
  used,
  limit,
  progress,
}: UsageProgressRowProps) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, SPRING_CONFIG);
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
        <m.div className="h-full bg-orange-500" style={{ width }} />
      </div>
    </div>
  );
}

function PlanBadge({
  isActivePro,
  workspaceslug,
}: {
  isActivePro: boolean;
  workspaceslug: string;
}) {
  if (isActivePro) {
    return (
      <div className="bg-primary/10 flex items-center rounded-md px-1.5 py-0.5 text-xs">
        <span className="">Pro</span>
      </div>
    );
  }

  return (
    <Link
      href={`/${workspaceslug}/settings/billing/upgrade`}
      className="bg-primary flex items-center rounded-md px-1.5 py-0.5 text-xs"
    >
      <span className="shiny-loader-text">Upgrade</span>
      <IoIosArrowRoundUp className="ml-0.5 rotate-45 text-white" />
    </Link>
  );
}

function EmptyUsageCard() {
  return (
    <Card className="w-full max-w-xs p-3.5 shadow-sm">
      <div className="text-muted-foreground flex items-center text-sm">
        Usage <ChevronRight className="ml-1 h-3 w-3" />
      </div>

      <div className="space-y-3">
        <UsageProgressRow
          icon={<MousePointerClick {...ICON_PROPS} />}
          label="Events"
          used={0}
          limit={0}
          progress={0}
        />
        <UsageProgressRow
          icon={<Link2 {...ICON_PROPS} />}
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

// ============================================================================
// Main Component
// ============================================================================

export function UsageStatsClient({
  isActivePro,
  workspace,
  usage,
  workspaceslug,
}: UsageStatsClientProps) {
  if (!workspace || !usage) {
    return (
      <LazyMotion features={domAnimation}>
        <EmptyUsageCard />
      </LazyMotion>
    );
  }

  const { clicksTracked, linksCreated, periodEnd } = usage;
  const { maxClicksLimit, maxLinksLimit } = workspace;

  const clicksProgress = calculateProgress(clicksTracked, maxClicksLimit);
  const linksProgress = calculateProgress(linksCreated, maxLinksLimit);
  const resetDate = formatResetDate(periodEnd);

  return (
    <LazyMotion features={domAnimation}>
      <Card className="mt-2 w-full max-w-xs p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="">
            <Link
              href={`/${workspaceslug}/settings/billing`}
              className="text-muted-foreground flex items-center text-sm transition-colors hover:text-zinc-700"
            >
              Usage <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <PlanBadge isActivePro={isActivePro} workspaceslug={workspaceslug} />
        </div>

        <div className="space-y-3">
          <UsageProgressRow
            icon={<MousePointerClick {...ICON_PROPS} />}
            label="Events"
            used={clicksTracked}
            limit={maxClicksLimit}
            progress={clicksProgress}
          />
          <UsageProgressRow
            icon={<Link2 {...ICON_PROPS} />}
            label="Links"
            used={linksCreated}
            limit={maxLinksLimit}
            progress={linksProgress}
          />
        </div>

        <p className="text-muted-foreground mt-2 text-xs">
          Usage will reset {resetDate}
        </p>
      </Card>
    </LazyMotion>
  );
}
