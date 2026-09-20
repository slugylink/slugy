"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PublicGalleryImage } from "@/types/bio-links";

interface GalleryViewerDialogProps {
  images: readonly PublicGalleryImage[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  alt?: string;
}

export default function GalleryViewerDialog({
  images,
  index,
  onIndexChange,
  onClose,
  alt = "Gallery image",
}: GalleryViewerDialogProps) {
  const isOpen = index !== null && index >= 0 && index < images.length;

  const goTo = useCallback(
    (direction: 1 | -1) => {
      if (index === null || images.length === 0) return;
      onIndexChange((index + direction + images.length) % images.length);
    },
    [index, images.length, onIndexChange],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goTo(1);
      if (event.key === "ArrowLeft") goTo(-1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goTo]);

  if (!isOpen) return null;

  const current = images[index ?? 0];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-1rem)] border-0 bg-transparent p-0 shadow-none sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Gallery image viewer</DialogTitle>

        <div className="relative flex h-[85vh] w-full flex-col overflow-hidden rounded-[18px] bg-black/95">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-medium">
              {(index ?? 0) + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close image viewer"
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.image}
              alt={alt}
              className="max-h-full max-w-full object-contain"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(-1)}
                  aria-label="Previous image"
                  className="absolute left-3 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  aria-label="Next image"
                  className="absolute right-3 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto px-3 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((image, imageIndex) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => onIndexChange(imageIndex)}
                  aria-label={`View image ${imageIndex + 1}`}
                  className={cn(
                    "size-12 shrink-0 overflow-hidden rounded-lg border-2 transition",
                    imageIndex === index
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
