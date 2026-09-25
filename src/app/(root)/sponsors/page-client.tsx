"use client";

import { Button } from "@/components/ui/button";
import { Database, GitBranch, MoonStar } from "lucide-react";
import { LazyMotion, domAnimation, m } from "motion/react";
import Image from "next/image";

const HIGHLIGHTS = [
  {
    icon: Database,
    title: "Serverless Postgres",
    description: "Scales with every click Slugy tracks — no ops overhead.",
  },
  {
    icon: GitBranch,
    title: "Branching",
    description: "Instant database branches for previews and safe migrations.",
  },
  {
    icon: MoonStar,
    title: "Scale to zero",
    description: "Quiet hours cost nothing; traffic spikes just work.",
  },
];

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const, delay },
});

export default function SponsorsPageClient() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="bg-transparent dark:bg-[#121212]">
        <div className="mx-auto mt-12 max-w-4xl px-4 py-16 text-center">
          <m.div {...fadeUp(0)}>
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Sponsors & Supporters
            </p>
            <h1 className="mt-2 text-2xl font-medium text-balance sm:text-4xl">
              Powered by Neon
            </h1>
            <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
              Slugy runs on serverless Postgres from Neon — the infrastructure
              behind every link, click, and report.
            </p>
          </m.div>

          <m.div {...fadeUp(0.15)}>
            <a
              href="https://neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Neon"
              className="mx-auto mt-8 inline-block rounded-[20px] bg-white p-8 shadow-sm transition-transform hover:scale-[1.02] sm:p-10"
            >
              <Image
                src="/icons/neon-logo.webp"
                alt="Neon logo"
                width={220}
                height={64}
                className="h-12 w-auto object-contain sm:h-14"
                priority
              />
            </a>
          </m.div>

          <div className="mt-10 grid grid-cols-1 gap-5 text-left sm:grid-cols-3">
            {HIGHLIGHTS.map((h, i) => (
              <m.div
                key={h.title}
                {...fadeUp(0.25 + i * 0.1)}
                className="rounded-[20px] border border-zinc-200/80 bg-white p-5 sm:p-6 dark:border-zinc-200/20 dark:bg-zinc-900/40"
              >
                <h.icon className="text-muted-foreground h-5 w-5" />
                <p className="mt-2 text-sm font-semibold">{h.title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {h.description}
                </p>
              </m.div>
            ))}
          </div>

          <m.div
            {...fadeUp(0.5)}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Button size="lg" className="rounded-lg" asChild>
              <a
                href="https://neon.tech"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Neon
              </a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-lg" asChild>
              <a
                href="https://github.com/sponsors/slugylink"
                target="_blank"
                rel="noopener noreferrer"
              >
                Become a sponsor
              </a>
            </Button>
          </m.div>
        </div>
      </div>
    </LazyMotion>
  );
}
