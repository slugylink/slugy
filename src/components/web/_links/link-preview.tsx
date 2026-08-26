"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Link2Off } from "lucide-react";

import { cn } from "@/lib/utils";
import { Loader2 } from "@/utils/icons/loader2";

const DEDUPE_MS = 60_000;
const URL_DEBOUNCE_MS = 400;

interface Metadata {
  title: string;
  description: string;
  image: string | null;
  favicon?: string | null;
  url?: string;
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

async function metadataFetcher(endpoint: string): Promise<Metadata> {
  const response = await fetch(endpoint, { credentials: "include" });
  const payload = (await response.json()) as {
    success?: boolean;
    data?: Metadata;
    error?: string;
  };

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.error || "Failed to load metadata");
  }

  return payload.data;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function PreviewImage({
  image,
  title,
}: {
  image: string | null;
  title: string;
}) {
  if (!image) {
    return (
      <span className="text-muted-foreground text-center text-sm">
        No preview image available
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote OG images are arbitrary hosts
    <img
      src={image}
      alt={title || "Link preview"}
      className="aspect-video h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

function PreviewContent({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1 border-t bg-zinc-50 p-2 dark:bg-zinc-900">
      <h2 className="line-clamp-1 text-xs font-semibold">
        {title || "No title available"}
      </h2>
      <p className="text-muted-foreground line-clamp-1 text-xs">
        {description || "No description available"}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <div className="flex aspect-video items-center justify-center rounded-t-lg">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
      <PreviewContent
        title="Loading metadata..."
        description="Please wait..."
      />
    </>
  );
}

function ErrorState() {
  return (
    <>
      <div className="flex aspect-video items-center justify-center rounded-t-lg">
        <Link2Off className="text-muted-foreground h-4 w-4" />
      </div>
      <PreviewContent
        title="Error loading metadata"
        description="Please try again."
      />
    </>
  );
}

function EmptyState() {
  return (
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
}

function SuccessState({ metadata }: { metadata: DisplayMetadata }) {
  return (
    <>
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-t-lg">
        <PreviewImage image={metadata.image} title={metadata.title} />
      </div>
      <PreviewContent
        title={metadata.title}
        description={metadata.description}
      />
    </>
  );
}

export default function LinkPreview({
  url,
  className,
  customImage,
  customTitle,
  customDescription,
}: LinkPreviewProps) {
  const trimmedUrl = url?.trim() ?? "";
  const debouncedUrl = useDebouncedValue(trimmedUrl, URL_DEBOUNCE_MS);
  const hasCustomPreview = Boolean(
    customTitle || customDescription || customImage,
  );
  const shouldFetch = Boolean(debouncedUrl);

  const { data, error, isLoading } = useSWR<Metadata, Error>(
    shouldFetch
      ? `/api/metadata?url=${encodeURIComponent(debouncedUrl)}`
      : null,
    metadataFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: DEDUPE_MS,
      keepPreviousData: true,
      shouldRetryOnError: false,
    },
  );

  const displayMetadata: DisplayMetadata = {
    title: customTitle || data?.title || "",
    description: customDescription || data?.description || "",
    image: customImage || data?.image || null,
  };

  let body: React.ReactNode = <EmptyState />;
  if (!shouldFetch && !hasCustomPreview) {
    body = <EmptyState />;
  } else if (isLoading && !hasCustomPreview && !data) {
    body = <LoadingState />;
  } else if (error && !hasCustomPreview && !data) {
    body = <ErrorState />;
  } else {
    body = <SuccessState metadata={displayMetadata} />;
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="relative overflow-hidden rounded-lg border md:max-w-xs md:min-w-xs">
        {body}
      </div>
    </div>
  );
}
