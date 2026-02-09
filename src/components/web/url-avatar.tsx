"use client";

import { memo, useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { getRootDomain } from "@/utils/get-rootdomain";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface UrlAvatarProps {
  url: string;
  size?: 4 | 5 | 6 | 8 | 10 | 12 | 16;
  imgSize?: number;
  className?: string;
  icon?: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const SIZE_CLASSES = {
  4: "h-4 w-4",
  5: "h-[18px] w-[18px]",
  6: "h-6 w-6",
  8: "h-9 w-9",
  10: "h-10 w-10",
  12: "h-12 w-12",
  16: "h-16 w-16",
} as const;

const IMAGE_QUALITY = {
  small: 75,
  medium: 85,
} as const;

const MIN_FAVICON_SIZE = 16;
const FALLBACK_AVATAR_BASE = "https://avatar.vercel.sh";
const GOOGLE_FAVICON_BASE = "https://www.google.com/s2/favicons";

const CONTAINER_CLASSES =
  "flex items-center justify-center overflow-hidden rounded-full border " +
  "bg-gradient-to-b from-zinc-50/60 to-zinc-100 " +
  "dark:bg-gradient-to-b dark:from-zinc-900/60 dark:to-zinc-800";

// ============================================================================
// Utilities
// ============================================================================

function isLocalhost(domain: string): boolean {
  return (
    domain === "localhost" ||
    domain.includes("localhost") ||
    domain.includes("127.0.0.1")
  );
}

function generateFaviconSources(domain: string): string[] {
  if (isLocalhost(domain)) {
    return [`${FALLBACK_AVATAR_BASE}/${domain}?size=32`];
  }

  return [
    `${GOOGLE_FAVICON_BASE}?domain=${domain}&sz=64`,
    `${FALLBACK_AVATAR_BASE}/${domain}?size=32`,
  ];
}

function isFaviconTooSmall(img: HTMLImageElement): boolean {
  return (
    img.naturalWidth <= MIN_FAVICON_SIZE ||
    img.naturalHeight <= MIN_FAVICON_SIZE
  );
}

// ============================================================================
// Component
// ============================================================================

function UrlAvatar({
  url,
  size = 8,
  imgSize = 2.5,
  className,
  icon,
}: UrlAvatarProps) {
  // Memoized values
  const domain = useMemo(() => getRootDomain(url), [url]);
  const sources = useMemo(() => generateFaviconSources(domain), [domain]);

  // State
  const [loading, setLoading] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const [src, setSrc] = useState(sources[0]);

  // Reset state when URL changes
  useEffect(() => {
    setLoading(true);
    setErrorCount(0);
    setSrc(sources[0]);
  }, [url, sources]);

  // Event handlers
  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setLoading(false);
      const img = e.target as HTMLImageElement;

      // Fallback to next source if favicon is too small
      if (isFaviconTooSmall(img) && errorCount === 0 && sources.length > 1) {
        setErrorCount(1);
        setSrc(sources[1]);
      }
    },
    [errorCount, sources],
  );

  const handleError = useCallback(() => {
    const nextIndex = errorCount + 1;

    if (nextIndex < sources.length) {
      setErrorCount(nextIndex);
      setSrc(sources[nextIndex]);
    } else {
      setLoading(false);
    }
  }, [errorCount, sources.length]);

  // Computed properties
  const sizeClass = SIZE_CLASSES[size];
  const imageSize = size * imgSize;
  const quality = size <= 6 ? IMAGE_QUALITY.small : IMAGE_QUALITY.medium;
  const isLargeSize = size > 8;
  const isFallbackAvatar = src.startsWith(FALLBACK_AVATAR_BASE);

  // Render custom icon
  if (icon) {
    return (
      <div
        className={cn(sizeClass, CONTAINER_CLASSES, className)}
        aria-label={`Icon for ${domain}`}
      >
        {icon}
      </div>
    );
  }

  // Render favicon
  return (
    <div
      className={cn(sizeClass, CONTAINER_CLASSES, className)}
      aria-label={`Favicon for ${domain}`}
    >
      <picture>
        <source srcSet={src} type="image/png" />
        <Image
          alt={`Favicon for ${domain}`}
          title={`Favicon for ${domain}`}
          src={src}
          width={imageSize}
          height={imageSize}
          quality={quality}
          loading={isLargeSize ? "eager" : "lazy"}
          priority={isLargeSize}
          unoptimized={isFallbackAvatar}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "rounded-full transition-all duration-200",
            loading ? "opacity-70 blur-[1.5px]" : "blur-0 opacity-100",
          )}
        />
      </picture>
    </div>
  );
}

export default memo(UrlAvatar);
