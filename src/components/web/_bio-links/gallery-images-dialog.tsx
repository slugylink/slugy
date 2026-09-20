"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { mutate as globalMutate, type KeyedMutator } from "swr";
import type { EditorGallery, PublicGalleryImage } from "@/types/bio-links";
import { MAX_BIO_GALLERY_IMAGES } from "@/constants/bio-links";
import { compressImageForUpload } from "@/lib/client-image";

interface GalleryImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  images?: PublicGalleryImage[];
  mutate?: KeyedMutator<EditorGallery>;
}

interface GalleryApiResponse {
  images?: PublicGalleryImage[];
  error?: string;
}

async function parseGalleryResponse(
  res: Response,
): Promise<{ data: GalleryApiResponse | null; error: string | null }> {
  const text = await res.text();
  let data: GalleryApiResponse | null = null;

  try {
    data = text ? (JSON.parse(text) as GalleryApiResponse) : null;
  } catch {
    data = null;
  }

  if (res.ok) {
    return { data, error: null };
  }

  const fallback =
    res.status === 413
      ? "Images are too large to upload. Please try smaller images."
      : `Upload failed (${res.status})`;

  return { data, error: data?.error ?? fallback };
}

export default function GalleryImagesDialog({
  open,
  onOpenChange,
  username,
  images = [],
  mutate,
}: GalleryImagesDialogProps) {
  const [items, setItems] = useState<PublicGalleryImage[]>(images);
  const [isUploading, setIsUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const remainingSlots = MAX_BIO_GALLERY_IMAGES - items.length;
  const isAtLimit = remainingSlots <= 0;

  useEffect(() => {
    if (open) {
      setItems(images);
    }
  }, [open, images]);

  const refresh = async () => {
    if (mutate) {
      await mutate();
    } else {
      await globalMutate(`/api/bio-gallery/${username}`);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0 || isUploading) return;

    if (files.length > remainingSlots) {
      toast.error(
        remainingSlots <= 0
          ? `You can have up to ${MAX_BIO_GALLERY_IMAGES} images`
          : `You can add ${remainingSlots} more image${
              remainingSlots === 1 ? "" : "s"
            }`,
      );
      event.target.value = "";
      return;
    }

    setIsUploading(true);

    const uploaded: PublicGalleryImage[] = [];

    try {
      for (const file of files) {
        const compressed = await compressImageForUpload(file);
        const formData = new FormData();
        formData.append("files", compressed);

        const res = await fetch(`/api/bio-gallery/${username}/gallery`, {
          method: "POST",
          body: formData,
        });

        const { data, error } = await parseGalleryResponse(res);

        if (error) {
          throw new Error(error);
        }

        if (data?.images?.length) {
          uploaded.push(...data.images);
        }
      }

      setItems((prev) => [...prev, ...uploaded]);
      await refresh();
      toast.success(uploaded.length > 1 ? "Images uploaded" : "Image uploaded");
    } catch (error) {
      if (uploaded.length > 0) {
        setItems((prev) => [...prev, ...uploaded]);
        await refresh();
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to upload images",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (image: PublicGalleryImage) => {
    if (busyId) return;
    setBusyId(image.id);

    try {
      const res = await fetch(
        `/api/bio-gallery/${username}/gallery/${image.id}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const { error } = await parseGalleryResponse(res);
        throw new Error(error ?? "Failed to delete image");
      }

      setItems((prev) => prev.filter((item) => item.id !== image.id));
      await refresh();
      toast.success("Image deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete image",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleVisibility = async (image: PublicGalleryImage) => {
    if (busyId) return;
    const nextPublic = !image.isPublic;
    setBusyId(image.id);

    try {
      const res = await fetch(
        `/api/bio-gallery/${username}/gallery/${image.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic: nextPublic }),
        },
      );

      if (!res.ok) {
        const { error } = await parseGalleryResponse(res);
        throw new Error(error ?? "Failed to update image");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === image.id ? { ...item, isPublic: nextPublic } : item,
        ),
      );
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update image",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (busyId || targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const previous = items;
    setItems(reordered);
    setBusyId(moved.id);

    try {
      const updates = reordered
        .map((item, position) => ({ item, position }))
        .filter(({ item, position }) => item.position !== position);

      await Promise.all(
        updates.map(({ item, position }) =>
          fetch(`/api/bio-gallery/${username}/gallery/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position }),
          }).then(async (res) => {
            if (!res.ok) {
              const { error } = await parseGalleryResponse(res);
              throw new Error(error ?? "Failed to reorder images");
            }
          }),
        ),
      );

      setItems((prev) =>
        prev.map((item) => {
          const position = reordered.findIndex((entry) => entry.id === item.id);
          return position === -1 ? item : { ...item, position };
        }),
      );
      await refresh();
    } catch (error) {
      setItems(previous);
      toast.error(
        error instanceof Error ? error.message : "Failed to reorder images",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isUploading) onOpenChange(next);
      }}
    >
      <DialogContent className="overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Gallery</DialogTitle>
          <DialogDescription>
            Upload up to {MAX_BIO_GALLERY_IMAGES} images to display them in a
            horizontal carousel on your bio.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={isUploading}
        />

        {items.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400"
          >
            {isUploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            <span className="text-sm font-medium">
              {isUploading ? "Uploading..." : "Upload images"}
            </span>
            <span className="text-xs text-zinc-400">
              PNG, JPG, WEBP or GIF up to 5MB each
            </span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="grid max-h-[46vh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
              {items.map((image, index) => {
                const isBusy = busyId === image.id;
                return (
                  <div
                    key={image.id}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800",
                      !image.isPublic && "opacity-60",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/40 via-transparent to-black/50 p-1 opacity-0 transition group-hover:opacity-100">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDelete(image)}
                          disabled={isBusy}
                          aria-label="Delete image"
                          className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-red-600 disabled:opacity-60"
                        >
                          {isBusy ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleMove(index, -1)}
                          disabled={isBusy || index === 0}
                          aria-label="Move left"
                          className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 disabled:opacity-40"
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 1)}
                          disabled={isBusy || index === items.length - 1}
                          aria-label="Move right"
                          className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 disabled:opacity-40"
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(image)}
                      disabled={isBusy}
                      aria-label={image.isPublic ? "Hide image" : "Show image"}
                      className="absolute top-1 left-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80 disabled:opacity-60"
                    >
                      {image.isPublic ? (
                        <Eye className="size-3.5" />
                      ) : (
                        <EyeOff className="size-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isAtLimit}
            >
              {isUploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              {isAtLimit ? "Gallery full" : "Add images"}
              <span className="text-muted-foreground ml-auto text-xs">
                {items.length}/{MAX_BIO_GALLERY_IMAGES}
              </span>
            </Button>
          </div>
        )}

        <p className="text-muted-foreground text-xs">
          Tip: hidden images stay in your gallery but won&apos;t appear on your
          public page.
        </p>
      </DialogContent>
    </Dialog>
  );
}
