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

const statsData = [
  {
    title: "Active Users",
    count: 10,
    suffix: "+",
    icon: Users,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
  },
  {
    title: "Links Created",
    count: 50,
    suffix: "+",
    icon: Link,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50",
  },
  {
    title: "Clicks Tracked",
    count: 664,
    suffix: "+",
    icon: BarChart3,
    iconColor: "text-green-500",
    iconBg: "bg-green-50",
  },
] as const;

// Memoize growth data calculation
const generateGrowthData = () =>
  Array.from({ length: 100 }, (_, i) => ({
    x: i,
    y: Math.pow(1.045, i) * 10,
  }));

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
const StatCard = memo(({ stat }: { stat: (typeof statsData)[number] }) => (
  <motion.div
    variants={animations.item}
    className="rounded-2xl border border-zinc-200/40 p-1"
  >
    <Card className="flex aspect-square items-center justify-center overflow-hidden border-zinc-200 bg-white/80 shadow-none backdrop-blur-sm transition-all">
      <div className="p-4">
        <div className="mb-2 flex justify-center">
          <div className={`rounded-full p-2 ${stat.iconBg}`} />
        </div>
        <div className="text-center">
          <p className="text-primary font-mono text-2xl font-medium">
            <AnimatedNumber value={stat.count} suffix={stat.suffix} />
          </p>
          <h3 className="text-muted-foreground mt-1 text-sm">{stat.title}</h3>
        </div>
      </div>
    </Card>
  </motion.div>
));
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
      ref.current!.textContent = `${Math.round(latest)}${suffix}`;
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
  const growthData = useMemo(generateGrowthData, []);

  return (
    <section className="relative mx-auto mt-20 max-w-6xl px-4 md:mt-16">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Our Growth
        </h2>
        <p className="text-muted-foreground mt-3 text-sm md:text-base">
          Witness our exponential progress
        </p>
      </motion.div>

      <motion.div
        className="mt-12"
        variants={animations.container}
        initial="hidden"
        animate="show"
      >
        <Card className="overflow-hidden border-none bg-transparent p-6 shadow-none">
          <div className="relative">
            <div className="absolute top-0 left-0 z-10 grid w-[80%] grid-cols-2 gap-3 sm:grid-cols-2 lg:w-[35%]">
              {statsData.map((stat) => (
                <StatCard key={stat.title} stat={stat} />
              ))}
            </div>
            <div
              ref={chartRef}
              className="relative h-[370px] w-full sm:h-[500px]"
            >
              <div className="absolute inset-x-0 -bottom-3 z-20 h-[10%] w-full bg-gradient-to-b from-transparent via-[#fafaf8] to-[#fafaf8] dark:via-[#121212] dark:to-[#121212]" />
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
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
