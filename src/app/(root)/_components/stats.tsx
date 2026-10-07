"use client";
import { useInView, useSpring, useReducedMotion } from "motion/react";
import { useEffect, useRef, memo, type ComponentType } from "react";
import useSWR from "swr";
import { Users, Link } from "lucide-react";
import { AnalyticsIcon } from "@/components/web/_links/link-card-components";
import {
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/web/_motion/scroll-reveal";

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
}

const formatStatNumber = new Intl.NumberFormat("en-US");

interface SiteStats {
  users: number;
  links: number;
  clicks: number;
  cachedAt?: string;
}

const fetcher = async (url: string): Promise<SiteStats> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json() as Promise<SiteStats>;
};

// NOTE: kept local on purpose — /api/public/stats has no ETag, and the
// shared ETag fetcher's per-tab cache would serve day-old totals past the
// 24h CDN window. This fetcher always revalidates via CDN cache.

const StatItem = memo(
  ({
    stat,
  }: {
    stat: {
      title: string;
      count: number;
      suffix: string;
      icon: ComponentType<{ className?: string }>;
    };
  }) => {
    const Icon = stat.icon;
    return (
      <StaggerItem className="flex min-w-0 flex-col items-center py-4 text-center sm:py-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex shrink-0 items-center justify-center"
          >
            <Icon className="text-muted-foreground size-4" />
          </span>
          <h3 className="text-sm font-medium">{stat.title}</h3>
        </div>
        <p className="mt-4 text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">
          <AnimatedNumber value={stat.count} suffix={stat.suffix} />
        </p>
      </StaggerItem>
    );
  },
);

StatItem.displayName = "StatItem";

function AnimatedNumber({ value, suffix = "" }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const inView = useInView(ref, { once: true });
  const spring = useSpring(0, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });

  useEffect(() => {
    if (reducedMotion) {
      spring.jump(value);
    } else if (inView) {
      spring.set(value);
    }
  }, [inView, value, spring, reducedMotion]);

  useEffect(() => {
    if (!ref.current) return;

    return spring.onChange((latest) => {
      const formatted = formatStatNumber.format(Math.round(latest));
      ref.current!.textContent = `${formatted}${suffix}`;
    });
  }, [spring, suffix]);

  return (
    <span ref={ref} className="tabular-nums">
      {reducedMotion ? formatStatNumber.format(value) : "0"}
      {suffix}
    </span>
  );
}

export default function Stats() {
  const { data } = useSWR<SiteStats>("/api/public/stats", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    // Browser cache is 24h; don't refetch within that window.
    dedupingInterval: 24 * 60 * 60 * 1000,
  });

  // No verified numbers yet (API unreachable) → render nothing instead of
  // invented stats. Never show hardcoded growth claims.
  if (!data) return null;

  const statsData = [
    {
      title: "Active Users",
      count: data.users,
      suffix: "+",
      icon: Users,
    },
    {
      title: "Links Created",
      count: data.links,
      suffix: "+",
      icon: Link,
    },
    {
      title: "Clicks Tracked",
      count: data.clicks,
      suffix: "+",
      icon: AnalyticsIcon,
    },
  ] as const;

  return (
    <section
      aria-labelledby="stats-heading"
      className="mx-auto mt-8 max-w-6xl px-2 py-10 sm:px-4 sm:py-16"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Open startup
        </p>
        <h2
          id="stats-heading"
          className="mt-2 text-2xl font-medium text-balance sm:text-4xl"
        >
          Growing in the open
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Live totals from the Slugy platform — no vanity metrics.
        </p>
      </Reveal>

      <Stagger className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 md:grid-cols-3">
        {statsData.map((stat) => (
          <StatItem key={stat.title} stat={stat} />
        ))}
      </Stagger>
    </section>
  );
}
