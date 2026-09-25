"use client";
import { motion, useInView, useSpring } from "motion/react";
import { useEffect, useRef, memo, type ComponentType } from "react";
import useSWR from "swr";
import { Users, Link } from "lucide-react";
import { AnalyticsIcon } from "@/components/web/_links/link-card-components";

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

// Memoized StatCard component
const StatCard = memo(
  ({
    stat,
    showDivider,
  }: {
    stat: {
      title: string;
      count: number;
      suffix: string;
      icon: ComponentType<{ className?: string }>;
      iconColor: string;
      iconBg: string;
    };
    showDivider: boolean;
  }) => {
    const Icon = stat.icon;
    return (
      <motion.div
        variants={animations.item}
        className={
          showDivider
            ? "border-t border-zinc-200/70 pt-8 md:border-t-0 md:border-l md:pt-0 md:pl-8 dark:border-zinc-800"
            : ""
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className={`flex size-10 items-center justify-center rounded-xl ${stat.iconBg} dark:bg-zinc-800`}
          >
            <Icon className={`size-5 ${stat.iconColor} dark:text-zinc-200`} />
          </span>
          <p className="text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">
            <AnimatedNumber value={stat.count} suffix={stat.suffix} />
          </p>
          <h3 className="text-muted-foreground text-sm">{stat.title}</h3>
        </div>
      </motion.div>
    );
  },
);

StatCard.displayName = "StatCard";

const animations = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  },
  item: {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  },
} as const;

function AnimatedNumber({ value, suffix = "" }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const spring = useSpring(0, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });

  useEffect(() => {
    if (inView) {
      spring.set(value);
    }
  }, [inView, value, spring]);

  useEffect(() => {
    if (!ref.current) return;

    return spring.onChange((latest) => {
      const formatted = formatStatNumber.format(Math.round(latest));
      ref.current!.textContent = `${formatted}${suffix}`;
    });
  }, [spring, suffix]);

  return (
    <span ref={ref} className="tabular-nums">
      0{suffix}
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
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
    },
    {
      title: "Links Created",
      count: data.links,
      suffix: "+",
      icon: Link,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-50",
    },
    {
      title: "Clicks Tracked",
      count: data.clicks,
      suffix: "+",
      icon: AnalyticsIcon,
      iconColor: "text-green-500",
      iconBg: "bg-green-50",
    },
  ] as const;

  return (
    <section className="relative mx-auto max-w-6xl px-3 py-10 sm:px-4 sm:py-16">
      <motion.div
        className="mx-auto max-w-2xl text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Open startup
        </p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight text-balance sm:text-4xl">
          Growing in the open
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Live totals from the Slugy platform — no vanity metrics.
        </p>
      </motion.div>

      <motion.div
        className="mx-auto mt-8 max-w-4xl sm:mt-10"
        variants={animations.container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0">
          {statsData.map((stat, index) => (
            <StatCard key={stat.title} stat={stat} showDivider={index > 0} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
