"use client";

import type { ComponentProps } from "react";
import { withSlugyId } from "@/lib/leads/attribution";

const signupUrl =
  process.env.NODE_ENV === "production"
    ? `https://app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "slugy.co"}/signup`
    : "http://app.localhost:3000/signup";

/** Shared signup destination, preserving campaign attribution on navigation. */
export default function SignupLink({
  onClick,
  ...props
}: Omit<ComponentProps<"a">, "href">) {
  return (
    <a
      {...props}
      href={signupUrl}
      onClick={(event) => {
        event.currentTarget.href = withSlugyId(signupUrl);
        onClick?.(event);
      }}
    />
  );
}
