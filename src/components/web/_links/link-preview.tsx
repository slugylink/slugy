"use client";

import { cn } from "@/lib/utils";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import useSWR from "swr";

interface Metadata {
  title: string;
  description: string;
  image: string | null;
  favicon: string | null;
  url: string;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
}

export default function LinkPreview({ url, className }: LinkPreviewProps) {
  // Only fetch if url exists and is valid
  const shouldFetch = url && url.trim() !== "";

  const {
    data: metadata,
    error,
    isLoading,
  } = useSWR<Metadata, Error>(
    url && shouldFetch ? `/api/metadata?url=${url}` : null,
    {},
  );

  // Render placeholder during initial loading
  const renderLoadingState = () => (
    <div className="relative overflow-hidden rounded-lg border">
      <div className="flex aspect-video items-center justify-center rounded-lg">
        <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
      <div className="space-y-1 border-t bg-zinc-50 p-2 dark:bg-zinc-900">
        <h2 className="line-clamp-1 text-xs font-semibold">
          Loading metadata...
        </h2>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          Please wait...
        </p>
      </div>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="flex aspect-video items-center justify-center rounded-lg border">
      <span className="text-muted-foreground text-center text-sm">
        {error!.message ?? "Failed to load preview"}
      </span>
    </div>
  );

  // Render empty state when no URL is provided
  const renderEmptyState = () => (
    <div className="relative overflow-hidden rounded-lg border">
      <div className="flex aspect-video items-center justify-center rounded-lg">
        <span className="text-muted-foreground text-center text-sm">
          Enter a link to generate <br /> a preview
        </span>
      </div>
      <div className="space-y-1 border-t bg-zinc-50 p-2 dark:bg-zinc-900">
        <h2 className="line-clamp-1 text-xs font-semibold">
          Metadata title...
        </h2>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          Metadata description...
        </p>
      </div>
    </div>
  );

  // Render metadata preview with image
  const renderPreviewWithImage = () => (
    <div className="relative overflow-hidden rounded-lg border">
      <div className="flex aspect-video h-full w-full items-center justify-center overflow-hidden rounded-t-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={metadata?.image ?? ""}
          alt={metadata?.title ?? "Link preview image"}
          className="aspect-video h-full w-full overflow-hidden object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="space-y-1 bg-zinc-50 p-2 dark:bg-zinc-900">
        <h2 className="line-clamp-1 text-xs font-semibold">
          {metadata?.title ?? "No title available"}
        </h2>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {metadata?.description ?? "No description available"}
        </p>
      </div>
    </div>
  );

  // Render metadata preview without image
  const renderPreviewWithoutImage = () => (
    <div className="relative overflow-hidden rounded-lg border">
      <div className="flex aspect-video items-center justify-center rounded-lg">
        <span className="text-muted-foreground text-center text-sm">
          No preview image available
        </span>
      </div>
      <div className="space-y-1 border-t bg-zinc-50 p-2 dark:bg-zinc-900">
        <h2 className="line-clamp-1 text-xs font-semibold">
          {metadata?.title ?? "No title available"}
        </h2>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {metadata?.description ?? "No description available"}
        </p>
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-5", className)}>
      {isLoading
        ? renderLoadingState()
        : error
          ? renderErrorState()
          : !shouldFetch
            ? renderEmptyState()
            : metadata?.image
              ? renderPreviewWithImage()
              : renderPreviewWithoutImage()}
    </div>
  );
}
