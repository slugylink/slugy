"use client";
import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE, Reveal, Stagger, StaggerItem } from "./reveal";

interface Row {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  href: string;
  visual: React.ReactNode;
}

const ROWS: Row[] = [
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
      <Image
        src="/images/features/f1_converted.webp"
        alt="Slugy links dashboard with branded links and click counts"
        width={1270}
        height={960}
        quality={90}
        className="mx-auto h-auto w-full rounded-lg"
        sizes="(max-width: 768px) 100vw, 520px"
      />
    ),
  },
  {
    eyebrow: "Click analytics",
    title: "Every click, accounted for",
    description: "Referrers, campaigns, and geo — live, and ready to share.",
    bullets: [
      "Referrer + campaign + geo breakdown",
      "Shareable client-ready reports",
      "QR vs link attribution",
    ],
    cta: "See live analytics",
    href: "https://app.slugy.co",
    visual: (
      <Image
        src="/images/features/f2_converted.webp"
        alt="Slugy analytics funnel showing clicks converting to leads"
        width={1270}
        height={960}
        quality={90}
        className="mx-auto h-auto w-full rounded-lg"
        sizes="(max-width: 768px) 100vw, 520px"
      />
    ),
  },
];

const MINIS = [
  {
    eyebrow: "QR codes",
    title: "From link to scan in one click",
    description: "A print-ready, on-brand QR with every short link.",
    cta: "Create a QR code",
    href: "https://app.slugy.co",
    visual: (
      <Image
        src="/images/features/f3_converted.webp"
        alt="Slugy QR code designer with color and style options"
        width={1270}
        height={960}
        quality={90}
        className="mx-auto h-auto w-full rounded-lg"
        sizes="(max-width: 768px) 100vw, 400px"
      />
    ),
  },
  {
    eyebrow: "Bio links",
    title: "One page for all your links",
    description: "Your posts, videos, and QR codes behind a single URL.",
    cta: "Build your bio page",
    href: "https://app.slugy.co",
    visual: (
      <Image
        src="/images/features/f4_converted.webp"
        alt="Slugy bio link pages in different themes"
        width={1270}
        height={960}
        quality={90}
        className="mx-auto h-auto w-full rounded-lg"
        sizes="(max-width: 768px) 100vw, 400px"
      />
    ),
  },
];

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
        {ROWS.map((row, i) => (
          <motion.div
            key={row.eyebrow}
            className={cn(
              "grid grid-cols-1 items-center gap-6 p-6 sm:p-10 md:grid-cols-2",
              i > 0 && "border-t",
            )}
            initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: EASE }}
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
              <ul className="mt-4 space-y-1.5">
                {row.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
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
                "overflow-hidden rounded-xl border bg-zinc-50/60 dark:bg-zinc-900/40",
                i % 2 === 1 && "md:order-1",
              )}
            >
              {row.visual}
            </div>
          </motion.div>
        ))}

        <Stagger className="grid grid-cols-1 border-t md:grid-cols-2">
          {MINIS.map((mini, i) => (
            <StaggerItem
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
              <div className="mt-3 text-center">
                <Link
                  href={mini.href}
                  className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:opacity-80"
                >
                  {mini.cta} <ArrowRight className="h-4 w-4" />
                </Link>
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
