"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Eraser, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

const CLICK_IDS = [
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "dclid",
  "ttclid",
  "li_fat_id",
  "mc_cid",
  "mc_eid",
  "igshid",
  "mkt_tok",
] as const;

function stripParams(
  raw: string,
  stripUtm: boolean,
  stripClickIds: boolean,
): { clean: string; removed: string[] } {
  const trimmed = raw.trim();
  const url = new URL(
    trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
  );
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }
  const removed: string[] = [];
  const targets = new Set<string>([
    ...(stripUtm ? UTM_PARAMS : []),
    ...(stripClickIds ? CLICK_IDS : []),
  ]);
  for (const key of Array.from(url.searchParams.keys())) {
    if (targets.has(key.toLowerCase())) {
      removed.push(key);
      url.searchParams.delete(key);
    }
  }
  return { clean: url.toString(), removed };
}

export default function UtmStripperClient() {
  const [input, setInput] = useState("");
  const [stripUtm, setStripUtm] = useState(true);
  const [stripClickIds, setStripClickIds] = useState(true);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return {
        ok: true as const,
        ...stripParams(input, stripUtm, stripClickIds),
      };
    } catch {
      return { ok: false as const };
    }
  }, [input, stripUtm, stripClickIds]);

  const handleCopy = async () => {
    if (!result?.ok) return;
    try {
      await navigator.clipboard.writeText(result.clean);
      setCopied(true);
      toast.success("Clean URL copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select the URL manually");
    }
  };

  return (
    <>
      <section className="mx-auto max-w-5xl px-4 pt-10 sm:pt-14">
        <nav
          aria-label="Breadcrumb"
          className="text-muted-foreground flex items-center gap-1.5 text-[13px]"
        >
          <Link
            href="/tools"
            className="hover:text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Tools
            </span>
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">UTM Stripper</span>
        </nav>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl leading-[1.15] font-medium tracking-tight text-balance sm:text-[32px]">
              Free UTM Stripper — Clean URLs in One Click
            </h1>
            <p className="text-muted-foreground mt-2.5 max-w-xl text-[15px] leading-relaxed">
              Paste a tagged link to remove UTM parameters and ad click IDs.
              Runs entirely in your browser — your URLs never leave this page.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">No login</Badge>
            <Badge variant="secondary">Private by design</Badge>
            <Badge variant="secondary">One-click copy</Badge>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-6 p-5 sm:p-7">
            <div className="space-y-1.5">
              <Label htmlFor="strip-url" className="text-[13px]">
                Tagged URL
              </Label>
              <Input
                id="strip-url"
                inputMode="url"
                placeholder="https://example.com/page?utm_source=newsletter&utm_medium=email&utm_campaign=launch"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="h-11 font-mono text-[13px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Switch checked={stripUtm} onCheckedChange={setStripUtm} />
                <span>
                  UTM parameters
                  <span className="text-muted-foreground ml-1 hidden text-xs sm:inline">
                    (source, medium, campaign…)
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Switch
                  checked={stripClickIds}
                  onCheckedChange={setStripClickIds}
                />
                <span>
                  Ad click IDs
                  <span className="text-muted-foreground ml-1 hidden text-xs sm:inline">
                    (gclid, fbclid…)
                  </span>
                </span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInput("")}
                className="ml-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
            </div>

            {result && !result.ok && (
              <p className="text-sm text-red-600">
                That doesn&apos;t look like a valid URL — check it and try
                again.
              </p>
            )}

            {result?.ok && (
              <div className="space-y-3 rounded-xl border bg-zinc-50 p-4 dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                    Clean URL
                  </p>
                  <Button type="button" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="font-mono text-[13px] break-all">
                  {result.clean}
                </p>
                <p className="text-muted-foreground text-xs">
                  {result.removed.length > 0 ? (
                    <>
                      Removed {result.removed.length}:{" "}
                      <span className="font-mono">
                        {result.removed.join(", ")}
                      </span>
                    </>
                  ) : (
                    "No tracking parameters found — this URL is already clean."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-muted-foreground text-sm">
            <Eraser className="mr-1 inline h-4 w-4" />
            Need the opposite?{" "}
            <Link
              href="/tools/utm-builder"
              className="text-foreground font-medium underline underline-offset-4"
            >
              Build UTM-tagged URLs
            </Link>{" "}
            with the free UTM Builder.
          </p>
        </div>
      </section>
    </>
  );
}
