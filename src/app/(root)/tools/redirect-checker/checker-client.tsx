"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  Copy,
  Check,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Hop {
  url: string;
  status: number;
  location: string | null;
}

interface CheckResult {
  hops: Hop[];
  finalUrl: string;
  hopCount: number;
  truncated: boolean;
}

function statusTone(status: number): string {
  if (status >= 200 && status < 300)
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
  if (status >= 300 && status < 400)
    return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
}

export default function RedirectCheckerClient() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/tools/redirect-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input.trim() }),
      });
      const data = (await res.json()) as CheckResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Check failed");
      setResult(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Check failed — try again",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.finalUrl);
      setCopied(true);
      toast.success("Final URL copied");
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
          <span className="text-foreground">Redirect Checker</span>
        </nav>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl leading-[1.15] font-medium tracking-tight text-balance sm:text-[32px]">
              Free URL Checker — Redirects & Link Health
            </h1>
            <p className="text-muted-foreground mt-2.5 max-w-xl text-[15px] leading-relaxed">
              Paste any link to preview its destination and trace the full
              redirect chain with status codes. Verify short links, affiliate
              URLs and campaign links land where they should.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">No login</Badge>
            <Badge variant="secondary">301 · 302 · 307</Badge>
            <Badge variant="secondary">Up to 10 hops</Badge>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <form
            onSubmit={handleCheck}
            className="flex flex-col gap-3 p-5 sm:p-7"
          >
            <Label htmlFor="check-url" className="text-[13px]">
              URL to check
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="check-url"
                inputMode="url"
                placeholder="https://slugy.co/git"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="h-11 font-mono text-[13px]"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-11"
              >
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {loading ? "Checking…" : "Trace redirects"}
              </Button>
            </div>
          </form>

          {result && (
            <div className="border-t p-5 sm:p-7">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                  {result.hopCount} hop{result.hopCount === 1 ? "" : "s"}
                  {result.truncated ? " (chain truncated at 10)" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button asChild type="button" size="sm">
                    <Link
                      href="https://app.slugy.co/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Shorten & track
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy final URL"}
                  </Button>
                </div>
              </div>

              <ol className="mt-4 space-y-0">
                {result.hops.map((hop, i) => (
                  <li key={`${hop.url}-${i}`}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${statusTone(hop.status)}`}
                      >
                        {hop.status}
                      </span>
                      <span className="min-w-0 flex-1 font-mono text-[13px] break-all">
                        {hop.url}
                      </span>
                      {i === result.hops.length - 1 &&
                        hop.status >= 200 &&
                        hop.status < 300 && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300">
                            <ShieldCheck className="h-3.5 w-3.5" /> Lands here
                          </span>
                        )}
                    </div>
                    {i < result.hops.length - 1 && (
                      <div className="flex py-1 pl-6" aria-hidden>
                        <ArrowDown className="text-muted-foreground h-4 w-4" />
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              {result.hops.some((h) => h.status >= 400) && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  The chain ends in an error status — the destination may be
                  broken or blocking bots.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-muted-foreground text-sm">
            Chain looks wrong?{" "}
            <Link
              href="/tools/utm-stripper"
              className="text-foreground font-medium underline underline-offset-4"
            >
              Clean the tracking tags
            </Link>{" "}
            or shorten it with{" "}
            <Link
              href="/"
              className="text-foreground font-medium underline underline-offset-4"
            >
              Slugy
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
