"use client";

import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { Children, createContext, useContext, type ReactNode } from "react";

// A calm, decelerating curve — long tail so motion settles instead of stopping.
export const EASE = [0.22, 1, 0.36, 1] as const;

// Trigger a little above the bottom edge so the reveal is actually seen
// (not hidden behind the fold) while staying generous for short viewports.
export const SCROLL_VIEWPORT = {
  once: true,
  amount: "some",
  margin: "0px 0px -15% 0px",
} as const;

export const REVEAL_DURATION = 0.6;
export const REVEAL_BLUR = "blur(0px)";
const VISIBLE = { opacity: 1, y: 0 };
const StaggerDelay = createContext(0);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: REVEAL_DURATION, ease: EASE }}
    >
      {children}
    </MotionConfig>
  );
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}

/** Animate once with opacity and transform, avoiding costly blur filters. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  duration = REVEAL_DURATION,
}: RevealProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: Math.min(y, 20) }}
      animate={reducedMotion ? VISIBLE : undefined}
      whileInView={VISIBLE}
      viewport={SCROLL_VIEWPORT}
      transition={{
        duration: reducedMotion ? 0 : duration,
        ease: EASE,
        delay: reducedMotion ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) => (
        <StaggerDelay.Provider value={Math.min(index * stagger, 0.16)}>
          {child}
        </StaggerDelay.Provider>
      ))}
    </div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const delay = useContext(StaggerDelay);

  // Observe each card, not the entire grid: stacked cards must not reveal
  // offscreen on mobile. Cap delays so longer grids stay responsive.
  return (
    <Reveal className={className} delay={delay}>
      {children}
    </Reveal>
  );
}
