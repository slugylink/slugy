"use client";
import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE, Reveal, Stagger, StaggerItem } from "./reveal";
import { AnalyticsDemoVisual } from "./analytics-demo";

interface Row {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  href: string;
  visual: React.ReactNode;
  /** Stacked full-width layout (centered text, wide visual) instead of the side-by-side grid. */
  fullWidth?: boolean;
}

// ── Card 1: Branded links (rendered first, top of stack) ──
const ROWS: Row[] = [
  // Card 1 — "Branded links": side-by-side grid, links.svg visual on the right.
  {
    eyebrow: "Branded links",
    title: "Links that look like you",
    description:
      "Custom domains and branded slugs — every link on brand, whoever ships it.",
    bullets: [
      "Custom domains + branded slugs",
      "UTM builder + bulk creation",
      "Shared workspaces for teams",
    ],
    cta: "Create a branded link",
    href: "https://app.slugy.co",
    visual: (
      <div
        aria-hidden
        className="pointer-events-none flex max-h-[400px] items-start justify-center bg-white select-none dark:bg-zinc-950"
      >
        <Image
          src="/svgs/links.svg"
          alt=""
          width={345}
          height={331}
          className="pointer-events-none h-auto w-full max-w-[390px] select-none"
          sizes="(max-width: 768px) 100vw, 520px"
          draggable={false}
        />
      </div>
    ),
  },
];

// ── Card 4: Click analytics (rendered AFTER the QR + UTM mini row) ──
const ANALYTICS_ROW: Row = {
  eyebrow: "Click analytics",
  title: "Every click, accounted for",
  description: "Referrers, campaigns, and geo — live, and ready to share.",
  bullets: [
    "Referrer + campaign + geo breakdown",
    "Shareable client-ready reports",
  ],
  cta: "See live analytics",
  href: "https://app.slugy.co",
  visual: <AnalyticsDemoVisual />,
  fullWidth: true,
};

// ── Mini cards, Cards 2–3 (rendered directly below Branded links) ──
const MINIS1 = [
  // Card 2 — "QR codes" mini card (qrcode.svg visual).
  {
    eyebrow: "QR codes",
    title: "From link to scan in one click",
    description: "A print-ready, on-brand QR with every short link.",
    cta: "Create a QR code",
    href: "https://app.slugy.co",
    visual: (
      <div
        aria-hidden
        className="pointer-events-none flex max-h-[320px] items-start justify-center bg-white select-none lg:max-h-[355px] dark:bg-zinc-950"
      >
        <Image
          src="/svgs/qrcode.svg"
          alt=""
          width={484}
          height={549}
          className="pointer-events-none relative top-0 h-auto w-full max-w-[380px] select-none"
          sizes="(max-width: 768px) 100vw, 400px"
          draggable={false}
        />
      </div>
    ),
  },
  // Card 3 — "UTM Builder" mini card (utm.svg visual).
  {
    eyebrow: "UTM Builder",
    title: "Campaign URLs, done right",
    description: "Presets and validation for clean GA4-ready attribution.",
    cta: "Build a UTM URL",
    href: "https://app.slugy.co",
    visual: (
      <div
        aria-hidden
        className="pointer-events-none flex max-h-[320px] items-start justify-center bg-white select-none lg:max-h-[355px] dark:bg-zinc-950"
      >
        <Image
          src="/svgs/utm.svg"
          alt=""
          width={484}
          height={549}
          className="pointer-events-none relative top-0 h-auto w-full max-w-[380px] select-none"
          sizes="(max-width: 768px) 100vw, 400px"
          draggable={false}
        />
      </div>
    ),
  },
];

// ── Mini cards, second mini row (Cards 5–6, rendered last) ──
const MINIS2 = [
  // Card 5 — "Geo insights" mini card (device.svg visual: countries/cities + browsers/devices breakdown).
  {
    eyebrow: "Geo insights",
    title: "Know where every click comes from",
    description: "Country, city and browser breakdown on every link.",
    cta: "Explore click insights",
    href: "https://app.slugy.co",
    visual: (
      <div
        aria-hidden
        className="pointer-events-none flex max-h-[320px] items-start justify-center bg-white select-none lg:max-h-[355px] dark:bg-zinc-950"
      >
        <Image
          src="/svgs/device.svg"
          alt=""
          width={484}
          height={549}
          className="pointer-events-none relative top-0 h-auto w-full max-w-[380px] select-none"
          sizes="(max-width: 768px) 100vw, 400px"
          draggable={false}
        />
      </div>
    ),
  },
  // Card 6 — "Bio links" mini card (bio.png visual).
  {
    eyebrow: "Bio links",
    title: "One page for all your links",
    description: "Your posts, videos, and QR codes behind a single URL.",
    cta: "Build your bio page",
    href: "https://app.slugy.co",
    visual: (
      <div
        aria-hidden
        className="pointer-events-none flex max-h-[320px] items-start justify-center bg-white select-none lg:max-h-[355px] dark:bg-zinc-950"
      >
        <Image
          src="/svgs/bio.webp"
          alt=""
          width={484}
          height={549}
          className="pointer-events-none relative top-0 h-auto w-full max-w-[380px] select-none"
          sizes="(max-width: 768px) 100vw, 400px"
          draggable={false}
        />
      </div>
    ),
  },
];

// Bottom-to-top smooth fade, like a preview card dissolving at its bottom edge.
const VISUAL_FADE =
  "[mask-image:linear-gradient(to_bottom,white_72%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,white_72%,transparent_100%)]";

const Features = memo(function Features() {
  return (
    <div className="dark:bg-background mx-auto mt-8 max-w-6xl px-2 py-10 sm:px-4 sm:py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-medium text-balance sm:text-4xl">
          One toolkit for every link
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Shorten, share, and track — all on brand.
        </p>
      </Reveal>

      <div className="mt-8 overflow-hidden rounded-[20px] border sm:mt-10">
        {/* Card 1: Branded links */}
        {ROWS.map((row, i) => (
          <motion.div
            key={row.eyebrow}
            className={cn(
              "grid min-w-0 grid-cols-1 items-center gap-6 p-6 sm:p-10 md:grid-cols-2",
              i > 0 && "border-t",
            )}
            initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className={cn("min-w-0", i % 2 === 1 && "md:order-2")}>
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {row.eyebrow}
              </p>
              <h3 className="mt-2 text-xl font-medium text-balance sm:text-2xl">
                {row.title}
              </h3>
              <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed sm:text-base">
                {row.description}
              </p>
              <ul className="mt-4 space-y-1.5">
                {row.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <span
                      aria-hidden
                      className="text-zinc-400 dark:text-zinc-500"
                    >
                      •
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href={row.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:opacity-80"
              >
                {row.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div
              className={cn(
                "relative min-w-0 overflow-hidden",
                i % 2 === 1 && "md:order-1",
              )}
            >
              <div className={VISUAL_FADE}>{row.visual}</div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-white to-transparent dark:from-zinc-900"
              />
            </div>
          </motion.div>
        ))}

        {/* Cards 2–3: QR codes + UTM Builder (below Branded links) */}
        <Stagger className="grid grid-cols-1 border-t md:grid-cols-2">
          {MINIS1.map((mini, i) => (
            <StaggerItem
              key={mini.eyebrow}
              className={cn(
                "flex flex-col p-6 sm:p-10",
                i > 0 && "border-t md:border-t-0 md:border-l",
              )}
            >
              <div className="relative order-2 mt-6 min-w-0 overflow-hidden md:order-1 md:mt-0 md:mb-6">
                <div className={VISUAL_FADE}>{mini.visual}</div>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-zinc-950"
                />
              </div>
              <div className="order-1 md:order-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase md:text-center">
                  {mini.eyebrow}
                </p>
                <h3 className="mx-auto mt-2 max-w-sm text-lg font-medium md:text-center">
                  {mini.title}
                </h3>
                <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed md:text-center">
                  {mini.description}
                </p>
                <div className="mt-3 md:text-center">
                  <Link
                    href={mini.href}
                    className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:opacity-80"
                  >
                    {mini.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Card 4: Click analytics (full-width, below QR + UTM) */}
        <motion.div
          className="min-w-0 border-t p-6 sm:p-10"
          initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className="mx-auto max-w-2xl min-w-0 text-center">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {ANALYTICS_ROW.eyebrow}
            </p>
            <h3 className="mt-2 text-xl font-medium text-balance sm:text-2xl">
              {ANALYTICS_ROW.title}
            </h3>
            <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base">
              {ANALYTICS_ROW.description}
            </p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5">
              {ANALYTICS_ROW.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <span
                    aria-hidden
                    className="text-zinc-400 dark:text-zinc-500"
                  >
                    •
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
            <Link
              href={ANALYTICS_ROW.href}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:opacity-80"
            >
              {ANALYTICS_ROW.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative mt-8 min-w-0">
            {ANALYTICS_ROW.visual}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-white via-white/70 to-transparent dark:from-zinc-900 dark:via-zinc-900/70"
            />
          </div>
        </motion.div>

        {/* Cards 5–6: Geo insights + Bio links (below Click analytics) */}
        <Stagger className="grid grid-cols-1 border-t md:grid-cols-2">
          {MINIS2.map((mini, i) => (
            <StaggerItem
              key={mini.eyebrow}
              className={cn(
                "flex flex-col p-6 sm:p-10",
                i > 0 && "border-t md:border-t-0 md:border-l",
              )}
            >
              <div className="relative order-2 mt-6 min-w-0 overflow-hidden md:order-1 md:mt-0 md:mb-6">
                <div className={VISUAL_FADE}>{mini.visual}</div>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-zinc-950"
                />
              </div>
              <div className="order-1 md:order-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase md:text-center">
                  {mini.eyebrow}
                </p>
                <h3 className="mx-auto mt-2 max-w-sm text-lg font-medium md:text-center">
                  {mini.title}
                </h3>
                <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed md:text-center">
                  {mini.description}
                </p>
                <div className="mt-3 md:text-center">
                  <Link
                    href={mini.href}
                    className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:opacity-80"
                  >
                    {mini.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </div>
  );
});

Features.displayName = "Features";

export default Features;
