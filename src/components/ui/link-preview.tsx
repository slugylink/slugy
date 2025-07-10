"use client";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import Image from "next/image";
import { encode } from "qss";
import React, { memo, useCallback, useEffect, useState, useMemo } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LinkPreviewProps = {
  children: React.ReactNode;
  url: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  layout?: string;
} & (
  | { isStatic: true; imageSrc: string }
  | { isStatic?: false; imageSrc?: never }
);

const SPRING_CONFIG = { stiffness: 100, damping: 15 } as const;
const HOVER_DELAYS = { open: 50, close: 100 } as const;

const PreviewImage = memo(
  ({
    src,
    width,
    height,
    quality,
    layout,
    alt,
    className,
  }: {
    src: string;
    width: number;
    height: number;
    quality: number;
    layout: string;
    alt: string;
    className?: string;
  }) => (
    <Image
      src={src}
      width={width}
      height={height}
      quality={quality}
      layout={layout}
      priority={true}
      className={className}
      alt={alt}
    />
  )
);

PreviewImage.displayName = "PreviewImage";

export const LinkPreview = memo(({
  children,
  url,
  className,
  width = 200,
  height = 125,
  quality = 50,
  layout = "fixed",
  isStatic = false,
  imageSrc = "",
}: LinkPreviewProps) => {
  const [isOpen, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const x = useMotionValue(0);
  const translateX = useSpring(x, SPRING_CONFIG);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const src = useMemo(() => {
    if (isStatic) return imageSrc;
    
    const params = encode({
      url,
      screenshot: true,
      meta: false,
      embed: "screenshot.url",
      colorScheme: "dark",
      "viewport.isMobile": true,
      "viewport.deviceScaleFactor": 1,
      "viewport.width": width * 3,
      "viewport.height": height * 3,
    });
    
    return `https://api.microlink.io/?${params}`;
  }, [isStatic, imageSrc, url, width, height]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const targetRect = event.currentTarget.getBoundingClientRect();
    const eventOffsetX = event.clientX - targetRect.left;
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2;
    x.set(offsetFromCenter);
  }, [x]);

  const handleOpenChange = useCallback((open: boolean) => {
    setOpen(open);
  }, []);

  return (
    <>
      {isMounted && (
        <div className="hidden">
          <PreviewImage
            src={src}
            width={width}
            height={height}
            quality={quality}
            layout={layout}
            alt="hidden image"
          />
        </div>
      )}

      <HoverCardPrimitive.Root
        openDelay={HOVER_DELAYS.open}
        closeDelay={HOVER_DELAYS.close}
        onOpenChange={handleOpenChange}
      >
        <HoverCardPrimitive.Trigger
          onMouseMove={handleMouseMove}
          className={cn("text-black dark:text-white", className)}
          href={url}
        >
          {children}
        </HoverCardPrimitive.Trigger>

        <HoverCardPrimitive.Content
          className="[transform-origin:var(--radix-hover-card-content-transform-origin)]"
          side="top"
          align="center"
          sideOffset={10}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                className="rounded-xl shadow-xl"
                style={{ x: translateX }}
              >
                <Link
                  href={url}
                  className="block rounded-xl border-2 border-transparent bg-white p-1 shadow hover:border-neutral-200 dark:hover:border-neutral-800"
                  style={{ fontSize: 0 }}
                  target="_blank"
                >
                  <PreviewImage
                    src={src}
                    width={width}
                    height={height}
                    quality={quality}
                    layout={layout}
                    alt="preview image"
                    className="rounded-lg"
                  />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Root>
    </>
  );
});

LinkPreview.displayName = "LinkPreview";
