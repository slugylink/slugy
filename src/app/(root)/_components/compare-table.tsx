import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type CompareCell =
  | { type: "check"; label?: string }
  | { type: "none" }
  | { type: "text"; label: string };

const ROWS: Array<{
  label: string;
  slugy: CompareCell;
  bitly: CompareCell;
  dub: CompareCell;
}> = [
  {
    label: "Free plan",
    slugy: { type: "check", label: "Free, no credit card" },
    bitly: { type: "text", label: "5 links/mo · 2 QR/mo" },
    dub: { type: "text", label: "25 links/mo · 1K events/mo" },
  },
  {
    label: "Custom domain to start",
    slugy: { type: "check", label: "Included" },
    bitly: { type: "text", label: "Growth plan ($29/mo) and up" },
    dub: { type: "check", label: "3 domains on free" },
  },
  {
    label: "QR codes",
    slugy: { type: "check", label: "With every link" },
    bitly: { type: "text", label: "2/mo on free" },
    dub: { type: "check", label: "Included" },
  },
  {
    label: "Bio / link-in-bio page",
    slugy: { type: "check", label: "Included" },
    bitly: { type: "text", label: "2 landing pages/mo on free" },
    dub: { type: "none" },
  },
  {
    label: "UTM builder",
    slugy: { type: "check", label: "Included" },
    bitly: { type: "text", label: "Core plan and up" },
    dub: { type: "check", label: "Included" },
  },
  {
    label: "Lead conversion tracking",
    slugy: { type: "check", label: "Pro plan" },
    bitly: { type: "none" },
    dub: { type: "text", label: "Business plan and up" },
  },
  {
    label: "Open source",
    slugy: { type: "check", label: "Public on GitHub" },
    bitly: { type: "none" },
    dub: { type: "check", label: "AGPLv3" },
  },
];

function Cell({ cell, highlight }: { cell: CompareCell; highlight?: boolean }) {
  if (cell.type === "check") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <Check
          className="h-4 w-4 shrink-0 text-green-600"
          aria-label="Included"
        />
        {cell.label && (
          <span className="text-muted-foreground">{cell.label}</span>
        )}
      </span>
    );
  }
  if (cell.type === "none") {
    return (
      <Minus
        className="h-4 w-4 text-zinc-300 dark:text-zinc-700"
        aria-label="Not included"
      />
    );
  }
  return (
    <span
      className={cn(
        "text-sm",
        highlight ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {cell.label}
    </span>
  );
}

export default function CompareTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="px-3 py-3 text-sm font-medium" />
            <th className="rounded-t-xl bg-orange-50/70 px-3 py-3 text-sm font-semibold dark:bg-orange-950/20">
              Slugy
            </th>
            <th className="text-muted-foreground px-3 py-3 text-sm font-medium">
              Bitly
            </th>
            <th className="text-muted-foreground px-3 py-3 text-sm font-medium">
              Dub.co
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b last:border-b-0">
              <td className="text-foreground px-3 py-3 text-sm font-medium">
                {row.label}
              </td>
              <td className="bg-orange-50/70 px-3 py-3 dark:bg-orange-950/20">
                <Cell cell={row.slugy} highlight />
              </td>
              <td className="px-3 py-3">
                <Cell cell={row.bitly} />
              </td>
              <td className="px-3 py-3">
                <Cell cell={row.dub} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted-foreground mt-3 text-xs">
        Competitor limits from public pricing pages, last checked September 2026
        — plans change, so verify before you buy.
      </p>
    </div>
  );
}
