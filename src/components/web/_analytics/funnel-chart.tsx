"use client";

import { useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";

export interface FunnelStageInput {
  id: "clicks" | "leads";
  label: string;
  value: number;
  color: string;
}

const W = 900;
const H = 320;
const CY = H / 2;
const MAXH = 118;

function flowPath(x0: number, x1: number, h0: number, h1: number) {
  const mx = (x0 + x1) / 2;
  return [
    `M ${x0} ${CY - h0}`,
    `C ${mx} ${CY - h0} ${mx} ${CY - h1} ${x1} ${CY - h1}`,
    `L ${x1} ${CY + h1}`,
    `C ${mx} ${CY + h1} ${mx} ${CY + h0} ${x0} ${CY + h0}`,
    "Z",
  ].join(" ");
}

function formatPercent(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  if (n > 0 && n < 0.01) return "<0.01%";
  if (n < 10) return `${n.toFixed(2)}%`;
  if (n < 100) return `${n.toFixed(1)}%`;
  return `${Math.round(n)}%`;
}

interface FunnelChartProps {
  clicks: number;
  leads: number;
  className?: string;
}

export function FunnelChart({ clicks, leads, className }: FunnelChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const stages = useMemo(() => {
    const safeClicks = Math.max(0, clicks);
    const safeLeads = Math.max(0, leads);
    const leadRate =
      safeClicks > 0 ? (safeLeads / safeClicks) * 100 : safeLeads > 0 ? 100 : 0;

    const raw: FunnelStageInput[] = [
      { id: "clicks", label: "Clicks", value: safeClicks, color: "#2563eb" },
      { id: "leads", label: "Leads", value: safeLeads, color: "#ab3bdf" },
    ];

    // Both bands scale with their values relative to the largest stage,
    // so the funnel shape always reflects the real clicks/leads split.
    // Non-zero stages keep a minimum height so small conversions stay visible.
    const maxValue = Math.max(safeClicks, safeLeads, 1);
    const MIN_RATIO = 0.12;
    const ratioOf = (v: number) =>
      v <= 0 ? 0 : Math.max(v / maxValue, MIN_RATIO);

    const b0 = MAXH * ratioOf(safeClicks);
    const b1 = MAXH * ratioOf(safeLeads);
    const b2 = b1 * 0.45;

    return raw.map((stage, i) => ({
      ...stage,
      percent: i === 0 ? "100%" : formatPercent(leadRate),
      h0: i === 0 ? b0 : b1,
      h1: i === 0 ? b1 : b2,
    }));
  }, [clicks, leads]);

  const isEmpty = stages.every((s) => s.value === 0);
  const col = W / stages.length;
  const activeStage = active != null ? stages[active] : null;

  if (isEmpty) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex h-full w-full items-center justify-center text-sm",
          className,
        )}
        role="img"
        aria-label="Conversion funnel from clicks to leads"
      >
        No funnel data yet.
      </div>
    );
  }

  return (
    <div
      className={cn("relative h-full w-full", className)}
      onMouseLeave={() => setActive(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="relative h-full w-full"
        role="img"
        aria-label="Conversion funnel from clicks to leads"
      >
        {stages.map((stage, i) => {
          const x0 = i * col;
          const x1 = x0 + col;
          const dimmed = active != null && active !== i;
          return (
            <g
              key={stage.id}
              fill={stage.color}
              opacity={dimmed ? 0.35 : 1}
              className="transition-opacity duration-200"
            >
              <path
                d={flowPath(x0, x1, stage.h0 * 1.22, stage.h1 * 1.22)}
                opacity={0.07}
              />
              <path
                d={flowPath(x0, x1, stage.h0 * 1.1, stage.h1 * 1.1)}
                opacity={0.14}
              />
              <path d={flowPath(x0, x1, stage.h0, stage.h1)} />
            </g>
          );
        })}
        {/* Column divider */}
        <line
          x1={col}
          y1={0}
          x2={col}
          y2={H}
          stroke="hsl(var(--border))"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Percent pills */}
      <div className="pointer-events-none absolute inset-0">
        {stages.map((stage, i) => (
          <span
            key={stage.id}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-zinc-700 tabular-nums shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            style={{ left: `${((i + 0.5) / stages.length) * 100}%` }}
          >
            {stage.percent}
          </span>
        ))}
      </div>

      {/* Hover hit targets + tooltip */}
      <div className="absolute inset-0 grid grid-cols-2">
        {stages.map((stage, i) => (
          <div
            key={stage.id}
            className="relative"
            onMouseEnter={() => setActive(i)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setCursor({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }}
          />
        ))}
      </div>

      {activeStage && active != null && (
        <div
          className="pointer-events-none absolute z-30"
          style={{
            left: `calc(${(active + 0.5) * 50}% )`,
            top: Math.max(8, cursor.y - 64),
            transform: "translateX(-50%)",
          }}
          role="tooltip"
        >
          <div className="min-w-[140px] rounded-md border bg-white py-2">
            <p className="text-foreground m-0 px-3 text-sm font-normal">
              {activeStage.label}
            </p>
            <Separator className="my-1 px-0" />
            <div className="text-foreground m-0 flex items-center gap-2 px-3 text-sm">
              <div
                className="h-2 w-2 shrink-0"
                style={{ backgroundColor: activeStage.color }}
              />
              <span>{activeStage.label}:</span>
              {formatNumber(activeStage.value)}
            </div>
            <p className="text-muted-foreground m-0 px-3 pt-1 text-xs">
              {activeStage.percent} of clicks
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FunnelChart;
