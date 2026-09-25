"use client";
import React, { memo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import FeatureLinkCard, {
  DEMO_LINKS,
} from "@/components/web/_features/feature-link-card";
import FeatureQRCodeDesign from "@/components/web/_features/feature-qr-code-design";
import FeatureAnalyticsChart from "@/components/web/_features/feature-chart";
import FeatureLinkPreview from "@/components/web/_features/feature-preview";

interface Row {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  visual: React.ReactNode;
}

const ROWS: Row[] = [
  {
    eyebrow: "Slugy Links",
    title: "Links that look like you",
    description:
      "Shared workspaces, custom domains, and bulk creation — every link on brand, whoever ships it.",
    cta: "Explore Links",
    visual: (
      <div className="space-y-2">
        <FeatureLinkCard className="mx-auto" link={DEMO_LINKS[0]} />
        <FeatureLinkCard className="mx-auto w-[97%]" link={DEMO_LINKS[1]} />
      </div>
    ),
  },
  {
    eyebrow: "Slugy Analytics",
    title: "Every click, accounted for",
    description:
      "Referrers, campaigns, geo routing, and reports you can send to clients — live.",
    cta: "Explore Analytics",
    visual: <FeatureAnalyticsChart timePeriod="7d" />,
  },
  {
    eyebrow: "Bio Links",
    title: "Your whole internet, on one page",
    description:
      "A bio page, branded links, and QR codes for every post — everything you share behind a single URL.",
    cta: "Explore Bio Links",
    visual: (
      <div className="mx-auto max-w-[300px]">
        <FeatureLinkPreview
          username={"sandip"}
          links={[
            { id: "1", title: "Portfolio", url: "https://slugy.co/sandip" },
            { id: "2", title: "Github", url: "https://slugy.co/git" },
          ]}
          socials={[]}
          name={"Sandip"}
          bio={"Full Stack Developer"}
          logo={"/logo.svg"}
          initialTheme={"prism"}
        />
      </div>
    ),
  },
];

const MINIS = [
  {
    eyebrow: "QR codes",
    title: "From link to scan in one click",
    description:
      "A print-ready code rides along with every short link, styled to match your brand.",
    visual: (
      <div className="mx-auto max-w-[280px]">
        <FeatureQRCodeDesign code="app" />
      </div>
    ),
  },
  {
    eyebrow: "Control",
    title: "Password, expiry & geo",
    description:
      "Protect sensitive links, auto-expire campaigns, and route countries to the right destination.",
    visual: (
      <div className="mx-auto max-w-[280px] space-y-2 rounded-xl border bg-zinc-50/60 p-4 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm dark:bg-zinc-950">
          <span className="truncate font-medium">slugy.co/launch</span>
          <span className="ml-2 shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] text-white dark:bg-zinc-100 dark:text-zinc-900">
            Password
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm dark:bg-zinc-950">
          <span className="truncate font-medium">slugy.co/sale</span>
          <span className="ml-2 shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
            Expires Fri
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm dark:bg-zinc-950">
          <span className="truncate font-medium">slugy.co/global</span>
          <span className="ml-2 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            12 countries
          </span>
        </div>
      </div>
    ),
  },
];

const Features = memo(function Features() {
  return (
    <div className="dark:bg-background mx-auto mt-4 max-w-6xl px-2 py-10 sm:mt-6 sm:px-4 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-medium text-balance sm:text-4xl">
          Built for creators, marketers, and teams
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Whatever you share and wherever you share it — one toolkit covers
          every link.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-[20px] border sm:mt-10">
        {ROWS.map((row, i) => (
          <div
            key={row.eyebrow}
            className={cn(
              "grid grid-cols-1 items-center gap-6 p-6 sm:p-10 md:grid-cols-2",
              i > 0 && "border-t",
            )}
          >
            <div className={cn(i % 2 === 1 && "md:order-2")}>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {row.eyebrow}
              </p>
              <h3 className="mt-2 text-xl font-medium text-balance sm:text-2xl">
                {row.title}
              </h3>
              <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed sm:text-base">
                {row.description}
              </p>
              <Link
                href="/#features"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:opacity-80"
              >
                {row.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div
              className={cn(
                "rounded-xl border bg-zinc-50/60 p-4 dark:bg-zinc-900/40",
                i % 2 === 1 && "md:order-1",
              )}
            >
              {row.visual}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-1 border-t md:grid-cols-2">
          {MINIS.map((mini, i) => (
            <div
              key={mini.eyebrow}
              className={cn(
                "p-6 sm:p-10",
                i > 0 && "border-t md:border-t-0 md:border-l",
              )}
            >
              <div className="mb-6">{mini.visual}</div>
              <p className="text-muted-foreground text-center text-xs font-semibold tracking-widest uppercase">
                {mini.eyebrow}
              </p>
              <h3 className="mx-auto mt-2 max-w-sm text-center text-lg font-medium">
                {mini.title}
              </h3>
              <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed">
                {mini.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

Features.displayName = "Features";

export default Features;
