"use client";

import { cn } from "@/lib/utils";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { Link2Off } from "lucide-react";
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
  const shouldFetch = url && url.trim() !== "";

  const {
    data: metadata,
    error,
    isLoading,
  } = useSWR<Metadata, Error>(
    shouldFetch ? `/api/metadata?url=${encodeURIComponent(url)}` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    },
  );

  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <>
          <div className="flex aspect-video items-center justify-center rounded-t-lg">
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
        </>
      );
    }

    // Error state
    if (error) {
      return (
        <>
          <div className="flex aspect-video items-center justify-center rounded-t-lg">
            <Link2Off className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="space-y-1 border-t bg-zinc-50 p-2 dark:bg-zinc-900">
            <h2 className="line-clamp-1 text-xs font-semibold">
              Error loading metadata
            </h2>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              Please try again.
            </p>
          </div>
        </>
      );
    }

    // Empty state
    if (!shouldFetch) {
      return (
        <>
          <div className="flex aspect-video items-center justify-center rounded-t-lg">
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
        </>
      );
    }

    // Success state with metadata
    return (
      <>
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-t-lg">
          {metadata?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={metadata.image}
              alt={metadata.title || "Link preview image"}
              className="aspect-video h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="text-muted-foreground text-center text-sm">
              No preview image available
            </span>
          )}
        </div>
        <div className="space-y-1 bg-zinc-50 p-2 dark:bg-zinc-900">
          <h2 className="line-clamp-1 text-xs font-semibold">
            {metadata?.title || "No title available"}
          </h2>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {metadata?.description || "No description available"}
          </p>
        </div>
      </>
    );
  };

  return (
    <div className={cn("space-y-5", className)}>
      <div className="relative overflow-hidden rounded-lg border">
        {renderContent()}
      </div>
    </div>
  );
}
