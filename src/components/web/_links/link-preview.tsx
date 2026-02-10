"use client";

import useSWR from "swr";
import { Link2Off } from "lucide-react";

import { cn } from "@/lib/utils";
import { Loader2 } from "@/utils/icons/loader2";

// Constants
const SWR_DEDUPING_INTERVAL = 60000; // Cache for 1 minute

// Types
interface Metadata {
  title: string;
  description: string;
  image: string | null;
  favicon: string | null;
  url: string;
}

interface MetadataResponse {
  success: boolean;
  data: Metadata;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
  customImage?: string | null;
  customTitle?: string | null;
  customDescription?: string | null;
}

interface DisplayMetadata {
  title: string;
  description: string;
  image: string | null;
}

// Utility functions
const metadataFetcher = async (endpoint: string): Promise<Metadata> => {
  const response = await fetch(endpoint);
  const data = (await response.json()) as MetadataResponse;
  return data.data;
};

// Sub-components
const PreviewImage = ({
  image,
  title,
}: {
  image: string | null;
  title: string;
}) => {
  if (!image) {
    return (
      <span className="text-muted-foreground text-center text-sm">
        No preview image available
      </span>
    );
  }

  return (
    <img
      src={image}
      alt={title || "Link preview image"}
      className="aspect-video h-full w-full object-cover"
      loading="lazy"
      decoding="async"
    />
  );
};

const PreviewContent = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="space-y-1 border-t bg-zinc-50 p-2 dark:bg-zinc-900">
    <h2 className="line-clamp-1 text-xs font-semibold">
      {title || "No title available"}
    </h2>
    <p className="text-muted-foreground line-clamp-1 text-xs">
      {description || "No description available"}
    </p>
  </div>
);

const LoadingState = () => (
  <>
    <div className="flex aspect-video items-center justify-center rounded-t-lg">
      <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
    </div>
    <PreviewContent title="Loading metadata..." description="Please wait..." />
  </>
);

const ErrorState = () => (
  <>
    <div className="flex aspect-video items-center justify-center rounded-t-lg">
      <Link2Off size={14} className="text-muted-foreground h-4 w-4" />
    </div>
    <PreviewContent
      title="Error loading metadata"
      description="Please try again."
    />
  </>
);

const EmptyState = () => (
  <>
    <div className="flex aspect-video items-center justify-center rounded-t-lg">
      <span className="text-muted-foreground text-center text-sm">
        Enter a link to generate <br /> a preview
      </span>
    </div>
    <PreviewContent
      title="Metadata title..."
      description="Metadata description..."
    />
  </>
);

const SuccessState = ({ metadata }: { metadata: DisplayMetadata }) => (
  <>
    <div className="flex !aspect-video items-center justify-center overflow-hidden rounded-t-lg">
      <PreviewImage image={metadata.image} title={metadata.title} />
    </div>
    <PreviewContent title={metadata.title} description={metadata.description} />
  </>
);

// Main component
export default function LinkPreview({
  url,
  className,
  customImage,
  customTitle,
  customDescription,
}: LinkPreviewProps) {
  const shouldFetch = url && url.trim() !== "";

  const {
    data: metadata,
    error,
    isLoading,
  } = useSWR<Metadata, Error>(
    shouldFetch ? `/api/metadata?url=${encodeURIComponent(url)}` : null,
    metadataFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: SWR_DEDUPING_INTERVAL,
    },
  );

  // Use custom metadata if available, otherwise use fetched metadata
  const displayMetadata: DisplayMetadata = {
    title: customTitle || metadata?.title || "",
    description: customDescription || metadata?.description || "",
    image: customImage || metadata?.image || null,
  };

  const renderContent = () => {
    if (isLoading) return <LoadingState />;
    if (error) return <ErrorState />;
    if (!shouldFetch) return <EmptyState />;
    return <SuccessState metadata={displayMetadata} />;
  };

  return (
    <div className={cn("space-y-5", className)}>
      <div className="relative overflow-hidden rounded-lg border md:max-w-xs md:min-w-xs">
        {renderContent()}
      </div>
    </div>
  );
}
