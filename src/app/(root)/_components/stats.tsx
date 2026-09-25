"use client";
import { Card } from "@/components/ui/card";
import { motion, useInView, useSpring } from "framer-motion";
import { useEffect, useRef, memo } from "react";
import useSWR from "swr";
import { Users, Link, BarChart3 } from "lucide-react";

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
}

const formatStatNumber = new Intl.NumberFormat("en-US");

interface SiteStats {
  users: number;
  links: number;
  clicks: number;
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
    borderClassName,
  }: {
    stat: {
      title: string;
      count: number;
      suffix: string;
      icon: typeof Users;
      iconColor: string;
      iconBg: string;
    };
    borderClassName: string;
  }) => (
    <motion.div variants={animations.item} className="mt-3 sm:mt-4">
      <Card
        className={`bg-zinc- flex overflow-hidden rounded-none px-2 py-1 shadow-none backdrop-blur-sm transition-all sm:px-4 ${borderClassName}`}
      >
        <div className="">
          <div className="text-start">
            <p className="text-primary font-mono text-lg font-medium sm:text-xl">
              <AnimatedNumber value={stat.count} suffix={stat.suffix} />
            </p>
            <h3 className="text-muted-foreground mt-1 text-sm">{stat.title}</h3>
          </div>
        </div>
      </Card>
    </motion.div>
  ),
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
    dedupingInterval: 60 * 60 * 1000,
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
      icon: BarChart3,
      iconColor: "text-green-500",
      iconBg: "bg-green-50",
    },
  ] as const;

  return (
    <section className="relative mx-auto mt-10 max-w-6xl px-3 py-2 sm:mt-12 sm:px-4">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-medium tracking-tight sm:text-4xl">
          Growing in the open
        </h2>
        <p className="text-muted-foreground mt-3 text-sm md:text-base">
          Live totals from the Slugy platform
        </p>
      </motion.div>

      <motion.div
        className=""
        variants={animations.container}
        initial="hidden"
        animate="show"
      >
        <Card className="mt-2 overflow-hidden border-none bg-transparent p-0 shadow-none">
          <div className="relative">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4">
              {statsData.map((stat, index) => (
                <StatCard
                  key={stat.title}
                  stat={stat}
                  borderClassName={
                    index === 0
                      ? "border-none"
                      : "border-t sm:border-l sm:border-t-0"
                  }
                />
              ))}
            </div>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
