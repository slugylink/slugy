"use client";
import type { ProfileSectionProps } from "@/types/bio-links";
import { getDisplayName } from "@/utils/bio-links";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { motion } from "motion/react";
import { fadeUp } from "@/app/(bio-links)/bio/[username]/page-client";

export default function ProfileSection({
  name,
  username,
  bio,
  theme,
  children,
}: ProfileSectionProps) {
  const displayName = getDisplayName(name, username);

  return (
    <section className="relative z-10 h-full min-h-full bg-transparent">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
      <motion.div
        className="absolute inset-x-0 bottom-0 z-10 px-6 pt-28 pb-8 text-center"
        {...fadeUp(0.05)}
      >
        <h1
          className={`flex items-center justify-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl ${theme.textColor}`}
        >
          <span>{displayName}</span>
          <RiVerifiedBadgeFill
            size={24}
            className="fill-blue-500 text-blue-500"
          />
        </h1>
        <p className="text-sm font-medium text-zinc-300 sm:text-base">
          @{username}
        </p>
        {children ? <div className="mt-3">{children}</div> : null}
        {bio && (
          <p
            className={`${theme.accentColor} mx-auto mt-4 text-sm leading-relaxed text-white/95 sm:text-base`}
          >
            {bio}
          </p>
        )}
      </motion.div>
    </section>
  );
}
