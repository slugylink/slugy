"use client";
import Image from "next/image";
import type { ProfileSectionProps } from "@/types/bio-links";
import { getDisplayName } from "@/utils/bio-links";

export default function ProfileSection({
  name,
  username,
  bio,
  theme,
  children,
  avatarUrl,
  avatarOverlay,
  nameAction,
}: ProfileSectionProps) {
  const displayName = getDisplayName(name, username);

  return (
    <section className="relative z-10 mt-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-1.5">
            <h1
              className={`min-w-0 flex-1 truncate text-xl leading-none font-bold tracking-tight sm:text-2xl ${theme.textColor}`}
            >
              {displayName}
            </h1>
            {nameAction}
          </div>
          {bio ? (
            <p
              className={`mt-2 max-w-[16rem] text-[13px] leading-snug sm:max-w-xs sm:text-[14px] ${theme.accentColor}`}
            >
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
              className="relative z-[1] size-[68px] rounded-full object-cover sm:size-[75px]"
            />
            {avatarOverlay}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
