"use client";
import { Card } from "@/components/ui/card";
import { motion, useInView, useSpring } from "framer-motion";
import { useEffect, useRef, useMemo, memo } from "react";
import { Users, Link, BarChart3, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from "recharts";

// Move interfaces and constants outside component
interface AnimatedNumberProps {
  value: number;
  suffix?: string;
}

const formatStatNumber = new Intl.NumberFormat("en-US");

const statsData = [
  {
    title: "Active Users",
    count: 100,
    suffix: "+",
    icon: Users,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
  },
  {
    title: "Links Created",
    count: 1000,
    suffix: "+",
    icon: Link,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50",
  },
  {
    title: "Clicks Tracked",
    count: 15000,
    suffix: "+",
    icon: BarChart3,
    iconColor: "text-green-500",
    iconBg: "bg-green-50",
  },
] as const;

// Memoized growth data calculation for better performance
const generateGrowthData = (() => {
  const cache = new Map<number, Array<{ x: number; y: number }>>();
  return (length: number = 100) => {
    if (cache.has(length)) {
      return cache.get(length)!;
    }
    const data = Array.from({ length }, (_, i) => {
      const baseTrend = 20 + i * 1.2;
      const waveA = Math.sin(i / 6) * 14;
      const waveB = Math.cos(i / 13) * 8;
      // Deterministic tiny jitter so the line doesn't look perfectly synthetic.
      const jitter = ((i * 17) % 9) - 4;
      const y = Math.max(8, baseTrend + waveA + waveB + jitter);

      return { x: i, y };
    });
    cache.set(length, data);
    return data;
  };
})();

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

// Memoize CustomTooltip component
const CustomTooltip = memo(
  ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-lg bg-white p-2 shadow-md">
        <p className="flex items-center gap-1 text-sm font-semibold text-zinc-700">
          {`Growth: ${payload[0]?.value?.toFixed(2)}`}
          <TrendingUp size={16} />
        </p>
      </div>
    );
  },
);
CustomTooltip.displayName = "CustomTooltip";

// Memoize StatCard component
const StatCard = memo(
  ({
    stat,
    borderClassName,
  }: {
    stat: (typeof statsData)[number];
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
  const chartRef = useRef(null);
  const isInView = useInView(chartRef, { once: true, amount: 0.5 });
  const growthData = useMemo(() => generateGrowthData(100), []);

  return (
    <section className="relative mx-auto mt-10 max-w-6xl px-3 py-2 sm:mt-12 sm:px-4">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-medium tracking-tight sm:text-4xl">
          Built to scale
        </h2>
        <p className="text-muted-foreground mt-3 text-sm md:text-base">
          Steady growth with natural ups and downs
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
            <div
              ref={chartRef}
              className="relative h-[280px] w-full sm:h-[360px] md:h-[420px]"
            >
              {isInView && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      strokeOpacity={0.4}
                    />
                    <defs>
                      <linearGradient
                        id="colorGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#ff9f43"
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="100%"
                          stopColor="#ff9f43"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke="#ff9f43"
                      strokeWidth={1}
                      fillOpacity={1}
                      fill="url(#colorGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
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
