"use client";
import React, { memo, useState, useEffect, useMemo } from "react";
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

function UrlAvatar({
  url,
  size = 8,
  imgSize = 2.5,
  className,
}: UrlAvatarProps) {
  const domain = useMemo(() => getRootDomain(url), [url]);
  const [loading, setLoading] = useState(true);
  const [errorCount, setErrorCount] = useState(0);

  // Define image sources in order of fallback with optimized sizes
  const sources = useMemo(
    () => [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      `https://avatar.vercel.sh/${domain}?size=32`,
    ],
    [domain],
  );

  const [src, setSrc] = useState(sources[0]);

  // Reset when URL changes
  useEffect(() => {
    setLoading(true);
    setErrorCount(0);
    setSrc(sources[0]);
  }, [url, sources]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setLoading(false);
    const target = e.target as HTMLImageElement;

    // If the image is too small, try the next source
    if (
      target.naturalWidth <= 16 &&
      target.naturalHeight <= 16 &&
      errorCount === 0
    ) {
      setErrorCount(1);
      setSrc(sources[1]);
    }
  };

  const handleError = () => {
    // Try the next source in the array
    const nextIndex = errorCount + 1;
    if (nextIndex < sources.length) {
      setErrorCount(nextIndex);
      setSrc(sources[nextIndex]);
    } else {
      // All sources failed, fall back to temp.svg
      setLoading(false);
    }
  };

  // Map size prop to Tailwind classes
  const sizeClasses = {
    4: "h-4 w-4",
    5: "h-[18px] w-[18px]",
    6: "h-6 w-6",
    8: "h-9 w-9",
    10: "h-10 w-10",
    12: "h-12 w-12",
    16: "h-16 w-16",
  };

  // Calculate optimal image dimensions
  const imageSize = size * imgSize;
  const quality = size <= 6 ? 75 : 85; // Lower quality for smaller sizes

  return (
    <div
      className={cn(
        sizeClasses[size],
        "flex items-center justify-center overflow-hidden rounded-full border bg-gradient-to-b from-zinc-50/60 to-zinc-100 dark:bg-gradient-to-b dark:from-zinc-900/60 dark:to-zinc-800",
        className,
      )}
      aria-label={`Favicon for ${domain}`}
    >
      <picture>
        <source srcSet={src} type="image/png" />
        <Image
          alt={`${domain}`}
          src={src ?? "/logo.svg"}
          width={imageSize}
          height={imageSize}
          quality={quality}
          loading={size > 8 ? "eager" : "lazy"}
          className={cn(
            loading ? "opacity-70 blur-[2px]" : "blur-0 opacity-100",
            "rounded-full transition-all duration-200",
          )}
          priority={size > 8}
          onLoad={handleLoad}
          onError={handleError}
        />
      </picture>
    </div>
  );
}

export default memo(UrlAvatar);
