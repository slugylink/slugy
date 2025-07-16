"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  size?: "sm" | "md";
}

function Switch({
  className,
  size = "sm",
  ...props
}: SwitchProps) {
  const rootSize =
    size === "sm"
      ? "h-4 w-6"
      : "h-[1.15rem] w-8";
  const thumbSize =
    size === "sm"
      ? "size-3"
      : "size-4";
  const thumbTranslate =
    size === "sm"
      ? "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
      : "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0";
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        `peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex ${rootSize} shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50`,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          `bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block rounded-full ring-0 transition-transform ${thumbSize} ${thumbTranslate}`
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch }
