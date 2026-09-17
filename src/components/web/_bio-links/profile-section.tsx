"use client";
import Image from "next/image";
import type { ProfileSectionProps } from "@/types/bio-links";
import { getDisplayName } from "@/utils/bio-links";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { LazyMotion, domAnimation, m } from "motion/react";
import { fadeUp } from "@/app/(bio-links)/bio/[username]/page-client";

export default function ProfileSection({
  name,
  username,
  bio,
  theme,
  children,
  isPreview: _isPreview = false,
  avatarUrl,
  layout = "overlay",
  avatarOverlay,
}: ProfileSectionProps) {
  const displayName = getDisplayName(name, username);

  if (layout === "split") {
    return (
      <section className="relative z-10 mt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-xl leading-none font-bold tracking-tight text-zinc-900 sm:text-2xl">
              {displayName}
            </h1>
            {bio ? (
              <p className="mt-2 max-w-[16rem] text-[12px] leading-snug text-zinc-400 sm:max-w-xs sm:text-sm">
                {bio}
              </p>
            ) : null}
          </div>
          {avatarUrl ? (
            <div className="relative shrink-0">
              <Image
                src={avatarUrl}
                alt={`${displayName}'s profile`}
                width={96}
                height={96}
                priority
                className="relative z-[1] size-[64px] rounded-full object-cover sm:size-[76px]"
              />
              {avatarOverlay}
            </div>
          ) : null}
        </div>
        {children ? <div className="mt-6">{children}</div> : null}
      </section>
    );
  }

  return (
    <section className="relative z-10 h-full min-h-full bg-transparent">
      <div className="absolute inset-x-0 bottom-0 h-[200px] bg-gradient-to-t from-black via-black/70 to-transparent md:h-[280px]" />
      <LazyMotion features={domAnimation}>
        <m.div
          className="absolute inset-x-0 bottom-0 z-10 px-6 pt-28 pb-8 text-center"
          {...fadeUp(0.04)}
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
        </m.div>
      </LazyMotion>
    </section>
  );
}
