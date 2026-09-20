"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublicGalleryImage } from "@/types/bio-links";

interface GalleryCarouselProps {
  images: readonly PublicGalleryImage[];
  className?: string;
  itemClassName?: string;
  alt?: string;
  onImageClick?: (index: number) => void;
}

export default function GalleryCarousel({
  images,
  className,
  itemClassName,
  alt = "Gallery image",
  onImageClick,
}: GalleryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScrollLeft > 4 && el.scrollLeft < maxScrollLeft - 4);
  }, []);

  useEffect(() => {
    updateScrollState();

    const el = scrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [images.length, updateScrollState]);

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction * Math.round(el.clientWidth * 0.8),
      behavior: "smooth",
    });
  }, []);

  if (images.length === 0) return null;

  return (
    <div className={cn("group/carousel relative mt-6 w-full", className)}>
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            role={onImageClick ? "button" : undefined}
            tabIndex={onImageClick ? 0 : undefined}
            aria-label={
              onImageClick
                ? `View image ${index + 1} of ${images.length}`
                : undefined
            }
            onClick={onImageClick ? () => onImageClick(index) : undefined}
            onKeyDown={
              onImageClick
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onImageClick(index);
                    }
                  }
                : undefined
            }
            className={cn(
              "relative aspect-square w-[31%] shrink-0 snap-start overflow-hidden rounded-2xl border border-black/5 bg-zinc-100 sm:w-32",
              onImageClick &&
                "cursor-pointer transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
              itemClassName,
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.image}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label="Previous images"
          className="absolute top-1/2 -left-2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-md backdrop-blur transition hover:bg-white"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label="Next images"
          className="absolute top-1/2 -right-2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-md backdrop-blur transition hover:bg-white"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}
