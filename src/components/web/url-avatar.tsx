"use client";

import { memo, useEffect, useState } from "react";
import Image from "next/image";
import { getRootDomain } from "@/utils/get-rootdomain";
import { cn } from "@/lib/utils";

interface UrlAvatarProps {
  url: string;
  size?: 4 | 5 | 6 | 8 | 10 | 12 | 16;
  imgSize?: number;
  className?: string;
  icon?: React.ReactNode;
}

const SIZE_CLASSES = {
  4: "h-4 w-4",
  5: "h-[18px] w-[18px]",
  6: "h-6 w-6",
  8: "h-9 w-9",
  10: "h-10 w-10",
  12: "h-12 w-12",
  16: "h-16 w-16",
} as const;

const MIN_FAVICON_PX = 16;
const FALLBACK_AVATAR = "https://avatar.vercel.sh";
const GOOGLE_FAVICON = "https://www.google.com/s2/favicons";

const CONTAINER_CLASSES =
  "flex items-center justify-center overflow-hidden rounded-full border " +
  "bg-gradient-to-b from-zinc-50/60 to-zinc-100 " +
  "dark:bg-gradient-to-b dark:from-zinc-900/60 dark:to-zinc-800";

function isLocalHost(domain: string): boolean {
  const value = domain.toLowerCase();
  return (
    value === "localhost" ||
    value.endsWith(".localhost") ||
    value.includes("127.0.0.1") ||
    value === "::1"
  );
}

function faviconSources(domain: string): string[] {
  const encoded = encodeURIComponent(domain);
  if (!domain || isLocalHost(domain)) {
    return [`${FALLBACK_AVATAR}/${encoded}?size=32`];
  }
  return [
    `${GOOGLE_FAVICON}?domain=${encoded}&sz=64`,
    `${FALLBACK_AVATAR}/${encoded}?size=32`,
  ];
}

function UrlAvatar({
  url,
  size = 8,
  imgSize = 2.5,
  className,
  icon,
}: UrlAvatarProps) {
  const domain = url?.trim() ? getRootDomain(url) : "slugy.co";
  const sources = faviconSources(domain);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSourceIndex(0);
    setLoading(true);
  }, [domain]);

  const src = sources[Math.min(sourceIndex, sources.length - 1)]!;
  const pixelSize = Math.max(Math.round(size * imgSize), MIN_FAVICON_PX);
  const preferEager = size > 8;

  if (icon) {
    return (
      <div
        className={cn(SIZE_CLASSES[size], CONTAINER_CLASSES, className)}
        aria-label={`Icon for ${domain}`}
      >
        {icon}
      </div>
    );
  }

  return (
    <div
      className={cn(SIZE_CLASSES[size], CONTAINER_CLASSES, className)}
      aria-label={`Favicon for ${domain}`}
    >
      <Image
        alt=""
        aria-hidden
        src={src}
        width={pixelSize}
        height={pixelSize}
        quality={size <= 6 ? 75 : 85}
        loading={preferEager ? "eager" : "lazy"}
        priority={preferEager}
        unoptimized
        onLoad={(event) => {
          const img = event.currentTarget;
          const tooSmall =
            img.naturalWidth > 0 &&
            img.naturalWidth <= MIN_FAVICON_PX &&
            sourceIndex === 0 &&
            sources.length > 1;

          if (tooSmall) {
            setSourceIndex(1);
            setLoading(true);
            return;
          }
          setLoading(false);
        }}
        onError={() => {
          if (sourceIndex + 1 < sources.length) {
            setSourceIndex((index) => index + 1);
            setLoading(true);
            return;
          }
          setLoading(false);
        }}
        className={cn(
          "rounded-full transition-all duration-200",
          loading ? "opacity-70 blur-[1.5px]" : "blur-0 opacity-100",
        )}
      />
    </div>
  );
}

export default memo(UrlAvatar);
