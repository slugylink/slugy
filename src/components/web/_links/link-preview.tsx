"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "@/utils/icons/loader2";
import { Link2Off } from "lucide-react";
import useSWR from "swr";

type MetadataResponse = {
  success: boolean;
  data: Metadata;
};

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
  customImage?: string | null;
  customTitle?: string | null;
  customDescription?: string | null;
}

export default function LinkPreview({
  url,
  className,
  customImage,
  customTitle,
  customDescription,
}: LinkPreviewProps) {
  const shouldFetch = url && url.trim() !== "";

  const fetcher = (endpoint: string) =>
    fetch(endpoint)
      .then((res) => res.json() as Promise<MetadataResponse>)
      .then((res) => res.data);

  const {
    data: metadata,
    error,
    isLoading,
  } = useSWR<Metadata, Error>(
    shouldFetch ? `/api/metadata?url=${encodeURIComponent(url)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    },
  );

  // Use custom metadata if available, otherwise use fetched metadata
  const displayMetadata = {
    title: customTitle || metadata?.title || "",
    description: customDescription || metadata?.description || "",
    image: customImage || metadata?.image || null,
  };

  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <>
          <div className="flex aspect-video items-center justify-center rounded-t-lg">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
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
            <Link2Off size={14} className="text-muted-foreground h-4 w-4" />
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
          {displayMetadata.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayMetadata.image}
              alt={displayMetadata.title || "Link preview image"}
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
        <div className="space-y-1 bg-zinc-50 p-2 dark:bg-zinc-900 border-t">
          <h2 className="line-clamp-1 text-xs font-semibold">
            {displayMetadata.title || "No title available"}
          </h2>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {displayMetadata.description || "No description available"}
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
