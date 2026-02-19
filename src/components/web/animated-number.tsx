"use client";

import {
  LazyMotion,
  domAnimation,
  m,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect } from "react";

export function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString(),
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <LazyMotion features={domAnimation}>
      <m.span>{display}</m.span>
    </LazyMotion>
  );
}
