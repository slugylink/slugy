"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatNumber } from "@/lib/format-number";
import { cn } from "@/lib/utils";

export interface FunnelStageInput {
  id: "clicks" | "leads";
  label: string;
  value: number;
  color: string;
  tint: string;
}

const W = 900;
const H = 320;
const CY = H / 2;
const MAX = 130;

function bandPath(hl: number, hr: number, x0: number, col: number) {
  const x1 = x0 + col;
  const flat = x0 + col * 0.3;
  const c1 = flat + (x1 - flat) * 0.45;
  const c2 = flat + (x1 - flat) * 0.55;
  return [
    `M ${x0} ${CY - hl}`,
    `L ${flat} ${CY - hl}`,
    `C ${c1} ${CY - hl} ${c2} ${CY - hr} ${x1} ${CY - hr}`,
    `L ${x1} ${CY + hr}`,
    `C ${c2} ${CY + hr} ${c1} ${CY + hl} ${flat} ${CY + hl}`,
    `L ${x0} ${CY + hl}`,
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
      {
        id: "clicks",
        label: "Clicks",
        value: safeClicks,
        color: "#2563eb",
        tint: "rgba(37, 99, 235, 0.08)",
      },
      {
        id: "leads",
        label: "Leads",
        value: safeLeads,
        color: "#ab3bdf",
        tint: "rgba(171, 59, 223, 0.08)",
      },
    ];

    const maxValue = Math.max(...raw.map((s) => s.value), 1);

    return raw.map((stage, i) => ({
      ...stage,
      percent: i === 0 ? "100%" : formatPercent(leadRate),
      ratio: Math.max(0.12, stage.value / maxValue),
    }));
  }, [clicks, leads]);

  const col = W / stages.length;
  const activeStage = active != null ? stages[active] : null;

  return (
    <div
      className={cn("relative h-full w-full", className)}
      onMouseLeave={() => setActive(null)}
    >
      <div className="pointer-events-none absolute inset-0 grid grid-cols-2">
        {stages.map((stage, i) => (
          <div
            key={stage.id}
            className={cn(
              "border-border transition-colors",
              i > 0 && "border-l",
            )}
            style={active === i ? { backgroundColor: stage.tint } : undefined}
          />
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="pointer-events-none relative h-full w-full"
        role="img"
        aria-label="Conversion funnel from clicks to leads"
      >
        {stages.map((stage, i) => {
          const next = stages[i + 1];
          const hl = stage.ratio * MAX;
          const hr = (next ? next.ratio : stage.ratio * 0.75) * MAX;
          return (
            <g key={stage.id} fill={stage.color}>
              <path
                d={bandPath(hl * 1.28, hr * 1.35, i * col, col)}
                opacity={0.12}
              />
              <path
                d={bandPath(hl * 1.12, hr * 1.18, i * col, col)}
                opacity={0.25}
              />
              <path d={bandPath(hl, hr, i * col, col)} />
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 grid grid-cols-2">
        {stages.map((stage, i) => (
          <div key={stage.id} className="relative grid place-items-center">
            {i < stages.length - 1 && (
              <span className="border-border bg-card absolute top-1/2 -right-3 z-10 grid size-6 -translate-y-1/2 place-items-center rounded-full border">
                <ChevronRight className="text-muted-foreground size-3.5" />
              </span>
            )}
            <span className="text-sm font-medium text-white drop-shadow-sm">
              {stage.percent}
            </span>
          </div>
        ))}
      </div>

      {/* Hover hit targets + tooltip (same pattern as timeseries chart) */}
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
            left: `calc(${active * 50}% + ${cursor.x}px)`,
            top: Math.max(8, cursor.y - 64),
            transform: "translateX(-50%)",
          }}
          role="tooltip"
        >
          <div className="min-w-[140px] rounded-md border bg-white py-2 shadow-xs">
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
