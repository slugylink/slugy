"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Link2,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CircleAlert,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SOURCE_PRESETS = [
  "google",
  "newsletter",
  "linkedin",
  "x",
  "instagram",
  "facebook",
  "youtube",
] as const;

const MEDIUM_PRESETS = [
  "cpc",
  "email",
  "social",
  "organic",
  "referral",
  "affiliate",
  "qr",
] as const;

const TEMPLATES = [
  {
    name: "Newsletter",
    values: {
      source: "newsletter",
      medium: "email",
      campaign: "weekly-digest",
      term: "",
      content: "header-cta",
    },
  },
  {
    name: "Paid search",
    values: {
      source: "google",
      medium: "cpc",
      campaign: "spring-launch",
      term: "url-shortener",
      content: "ad-variant-a",
    },
  },
  {
    name: "Social post",
    values: {
      source: "linkedin",
      medium: "social",
      campaign: "founder-story",
      term: "",
      content: "carousel-slide-1",
    },
  },
];

const CHEAT_SHEET: Array<[string, string, string]> = [
  ["utm_source", "Where traffic comes from", "newsletter · google · linkedin"],
  ["utm_medium", "How it reaches you", "email · cpc · social · qr"],
  ["utm_campaign", "Which campaign", "spring-launch · black-friday"],
  ["utm_term", "Paid keyword / audience", "url-shortener"],
  ["utm_content", "Variant / placement", "header-cta · ad-variant-b"],
];

const slugifyUtm = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_+.]/g, "");

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
      {children}
    </p>
  );
}

function PresetChips({
  presets,
  active,
  onPick,
}: {
  presets: readonly string[];
  active: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((p) => {
        const isActive = active.trim().toLowerCase() === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            aria-pressed={isActive}
            className={cn(
              "cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
              isActive
                ? "border-foreground bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

export default function UtmBuilderClient({
  faqs,
}: {
  faqs: Array<{ q: string; a: string }>;
}) {
  const [baseUrl, setBaseUrl] = useState("https://slugy.co/pricing");
  const [source, setSource] = useState("newsletter");
  const [medium, setMedium] = useState("email");
  const [campaign, setCampaign] = useState("spring-launch");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [autoFormat, setAutoFormat] = useState(true);
  const [copied, setCopied] = useState(false);

  const fmt = (v: string) => (autoFormat ? slugifyUtm(v) : v.trim());

  const { finalUrl, error, warnings, rows } = useMemo(() => {
    const warnings: string[] = [];
    const trimmed = baseUrl.trim();
    if (!trimmed)
      return {
        finalUrl: "",
        error: "Paste a destination URL to start.",
        warnings,
        rows: [] as Array<[string, string]>,
      };

    let parsed: URL;
    try {
      const withProto = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      parsed = new URL(withProto);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        return {
          finalUrl: "",
          error: "Only http(s) URLs are supported.",
          warnings,
          rows: [] as Array<[string, string]>,
        };
    } catch {
      return {
        finalUrl: "",
        error:
          "That URL looks invalid. Include the domain, e.g. example.com/page.",
        warnings,
        rows: [] as Array<[string, string]>,
      };
    }

    const params = new URLSearchParams(parsed.search);
    const entries: Array<[string, string]> = [
      ["utm_source", fmt(source)],
      ["utm_medium", fmt(medium)],
      ["utm_campaign", fmt(campaign)],
      ["utm_term", fmt(term)],
      ["utm_content", fmt(content)],
    ];
    const required = ["utm_source", "utm_medium", "utm_campaign"];
    for (const key of required) {
      const val = entries.find(([k]) => k === key)?.[1] ?? "";
      if (!val)
        return {
          finalUrl: "",
          error: `Missing ${key} — source, medium and campaign are required.`,
          warnings,
          rows: [] as Array<[string, string]>,
        };
    }
    for (const [k, v] of entries) {
      if (!v) continue;
      if (/\s/.test(v))
        warnings.push(`${k} contains spaces — use hyphens for clean GA4 rows.`);
      if (/[A-Z]/.test(v))
        warnings.push(`${k} has uppercase — GA4 is case-sensitive.`);
      params.set(k, v);
    }
    parsed.search = params.toString();
    return {
      finalUrl: parsed.toString(),
      error: "",
      warnings,
      rows: entries.filter(([, v]) => v),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, source, medium, campaign, term, content, autoFormat]);

  const copy = async () => {
    if (!finalUrl) return;
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      toast.success("Campaign URL copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — select the URL manually.");
    }
  };

  const reset = () => {
    setBaseUrl("");
    setSource("");
    setMedium("");
    setCampaign("");
    setTerm("");
    setContent("");
  };

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setSource(t.values.source);
    setMedium(t.values.medium);
    setCampaign(t.values.campaign);
    setTerm(t.values.term);
    setContent(t.values.content);
    toast.success(`${t.name} template applied`);
  };

  return (
    <>
      {/* Breadcrumb + hero */}
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
          <span className="text-foreground">UTM Builder</span>
        </nav>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl leading-[1.15] font-medium tracking-tight text-balance sm:text-[32px]">
              Free UTM Builder
            </h1>
            <p className="text-muted-foreground mt-2.5 max-w-xl text-[15px] leading-relaxed">
              Build clean campaign URLs with validated source, medium, campaign,
              term and content. Auto-formatted, encoded and ready for GA4.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">No login</Badge>
            <Badge variant="secondary">GA4 ready</Badge>
            <Badge variant="secondary">Auto-encoded</Badge>
          </div>
        </div>
      </section>

      {/* Tool */}
      <section className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="grid lg:grid-cols-[1fr_340px]">
            {/* Controls */}
            <div className="flex flex-col gap-7 p-5 sm:p-7">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionLabel>1 · Destination</SectionLabel>
                  <div className="flex gap-1.5">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all"
                      >
                        <Sparkles className="h-3 w-3" /> {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="utm-url" className="text-[13px]">
                    Website URL
                  </Label>
                  <div className="relative">
                    <Link2 className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="utm-url"
                      inputMode="url"
                      placeholder="https://your-site.com/landing"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t" />

              <div className="space-y-4">
                <SectionLabel>2 · Required tags</SectionLabel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="utm-source" className="text-[13px]">
                      utm_source
                    </Label>
                    <Input
                      id="utm-source"
                      placeholder="newsletter"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="h-11 font-mono text-[13px]"
                    />
                    <PresetChips
                      presets={SOURCE_PRESETS}
                      active={source}
                      onPick={setSource}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utm-medium" className="text-[13px]">
                      utm_medium
                    </Label>
                    <Input
                      id="utm-medium"
                      placeholder="email"
                      value={medium}
                      onChange={(e) => setMedium(e.target.value)}
                      className="h-11 font-mono text-[13px]"
                    />
                    <PresetChips
                      presets={MEDIUM_PRESETS}
                      active={medium}
                      onPick={setMedium}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utm-campaign" className="text-[13px]">
                    utm_campaign
                  </Label>
                  <Input
                    id="utm-campaign"
                    placeholder="spring-launch"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="h-11 font-mono text-[13px]"
                  />
                  <p className="text-muted-foreground text-xs">
                    e.g. spring-launch, black-friday, ebook-download
                  </p>
                </div>
              </div>

              <div className="border-t" />

              <div className="space-y-4">
                <SectionLabel>3 · Optional tags</SectionLabel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="utm-term" className="text-[13px]">
                      utm_term{" "}
                      <span className="text-muted-foreground font-normal">
                        (keyword)
                      </span>
                    </Label>
                    <Input
                      id="utm-term"
                      placeholder="url-shortener"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="h-11 font-mono text-[13px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utm-content" className="text-[13px]">
                      utm_content{" "}
                      <span className="text-muted-foreground font-normal">
                        (variant)
                      </span>
                    </Label>
                    <Input
                      id="utm-content"
                      placeholder="header-cta"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="h-11 font-mono text-[13px]"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoFormat((v) => !v)}
                    aria-pressed={autoFormat}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      autoFormat
                        ? "border-foreground bg-foreground/[0.03]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-7 items-center rounded-full p-0.5 transition-colors",
                        autoFormat
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/30",
                      )}
                    >
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full bg-white shadow transition-transform",
                          autoFormat ? "translate-x-3" : "translate-x-0",
                        )}
                      />
                    </span>
                    Auto-format: lowercase + hyphens
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear all
                  </button>
                </div>
              </div>
            </div>

            {/* Preview rail */}
            <div className="bg-muted/60 flex flex-col border-t lg:border-t-0 lg:border-l">
              <div className="flex flex-1 flex-col gap-4 p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <SectionLabel>Result</SectionLabel>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium",
                      error
                        ? "text-amber-600"
                        : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        error ? "bg-amber-500" : "bg-emerald-500",
                      )}
                    />
                    {error ? "needs input" : `${finalUrl.length} chars`}
                  </span>
                </div>

                {error ? (
                  <div className="bg-background flex items-start gap-2 rounded-xl border p-3.5 text-sm">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-muted-foreground text-[13px] leading-relaxed">
                      {error}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-background rounded-xl border p-3.5 shadow-sm">
                      <code className="text-xs leading-relaxed break-all">
                        {finalUrl}
                      </code>
                    </div>
                    <div className="bg-background overflow-hidden rounded-xl border">
                      {rows.map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-0"
                        >
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {k}
                          </span>
                          <span className="truncate font-mono text-xs font-medium">
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {warnings.length > 0 && !error && (
                  <ul className="space-y-1.5">
                    {warnings.map((w) => (
                      <li
                        key={w}
                        className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                      >
                        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid gap-2">
                  <Button
                    onClick={copy}
                    disabled={!finalUrl || !!error}
                    className="h-10 w-full"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy campaign URL"}
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    disabled={!finalUrl || !!error}
                    className="bg-background h-10 w-full"
                  >
                    <a
                      href={finalUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open test link <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed">
                  Long links look spammy in public.{" "}
                  <Link
                    href="https://app.slugy.co"
                    className="text-foreground font-medium underline-offset-4 hover:underline"
                  >
                    Shorten with Slugy
                  </Link>{" "}
                  to keep the tags but hide the clutter.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              n: "01",
              t: "Paste & pick",
              d: "Drop in any URL, then tap presets or a one-click template.",
            },
            {
              n: "02",
              t: "Validated live",
              d: "Missing tags, uppercase and spaces are flagged before you copy.",
            },
            {
              n: "03",
              t: "Copy & measure",
              d: "Paste into ads or email — attribution flows straight into GA4.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="bg-card rounded-2xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <p className="text-muted-foreground font-mono text-xs">{s.n}</p>
              <p className="mt-1 text-sm font-medium">{s.t}</p>
              <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cheat sheet */}
      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="bg-card overflow-hidden rounded-2xl border">
          <div className="border-b px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-medium">UTM cheat sheet</h2>
            <p className="text-muted-foreground mt-0.5 text-[13px]">
              The five tags GA4 understands — and what to put in each.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-[11px] tracking-wide uppercase">
                  <th className="px-5 py-2.5 font-medium sm:px-6">Parameter</th>
                  <th className="py-2.5 pr-4 font-medium">Means</th>
                  <th className="py-2.5 pr-5 font-medium sm:pr-6">Example</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {CHEAT_SHEET.map(([k, means, ex]) => (
                  <tr key={k} className="border-b last:border-0">
                    <td className="text-foreground px-5 py-2.5 font-mono text-xs sm:px-6">
                      {k}
                    </td>
                    <td className="py-2.5 pr-4 text-[13px]">{means}</td>
                    <td className="py-2.5 pr-5 font-mono text-xs sm:pr-6">
                      {ex}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-10">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
          FAQ
        </p>
        <h2 className="mt-2 text-xl font-medium tracking-tight">
          UTM questions
        </h2>
        <Accordion type="single" collapsible className="mt-4">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-[15px] hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </>
  );
}
