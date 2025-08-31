"use client";

import React, { useMemo, useCallback } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { fetcher } from "@/lib/fetcher";
import { useRouter } from "next/navigation";

// Constants for better maintainability
const LOADING_HEIGHT = "min-h-[80vh]";
const CONTAINER_CLASSES = "container mx-auto py-8";

// Dynamic import with loading fallback
const GalleryLinkTable = dynamic(
  () => import("@/components/web/_bio-links/glinks-table"),
  {
    ssr: true,
    loading: () => <GalleryLinkTableSkeleton />,
  },
);

// Loading skeleton component
function GalleryLinkTableSkeleton() {
  return (
    <div className={CONTAINER_CLASSES}>
      <div className="space-y-6">
        <div className="bg-muted h-10 w-48 animate-pulse rounded" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted h-20 w-full animate-pulse rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface Link {
  id: string;
  title: string;
  url: string;
  isPublic: boolean;
  position: number;
  clicks: number;
  galleryId: string;
}

interface Social {
  platform: string;
  url?: string;
  isPublic?: boolean;
}

interface Gallery {
  links: Link[];
  username: string;
  name?: string | null;
  bio?: string | null;
  logo?: string | null;
  socials?: Social[];
  theme?: string;
}

interface ApiError extends Error {
  info?: {
    error?: string;
  };
}

interface GalleryClientProps {
  username: string;
}

export default function GalleryClient({ username }: GalleryClientProps) {
  const router = useRouter();

  // SWR configuration with better error handling and performance
  const {
    data: gallery,
    isLoading,
    error,
    mutate,
  } = useSWR<Gallery, ApiError>(`/api/bio-gallery/${username}`, fetcher);

  // Memoized loading state
  const loadingState = useMemo(
    () => (
      <div
        className={`flex ${LOADING_HEIGHT} w-full items-center justify-center`}
      >
        <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    ),
    [],
  );

  // Memoized redirect handler
  const handleRedirect = useCallback(() => {
    router.push("/bio-links");
  }, [router]);

  // Handle redirects with useEffect hooks at the top level
  React.useEffect(() => {
    if (error) {
      // Redirect on error after a short delay
      const timer = setTimeout(handleRedirect, 2000);
      return () => clearTimeout(timer);
    }
  }, [error, handleRedirect]);

  React.useEffect(() => {
    if (!gallery && !isLoading && !error) {
      // Redirect immediately if no data
      handleRedirect();
    }
  }, [gallery, isLoading, error, handleRedirect]);

  // Handle error state
  if (error) {
    console.error("Gallery loading error:", error);

    return (
      <div
        className={`flex ${LOADING_HEIGHT} w-full flex-col items-center justify-center`}
      >
        <div className="text-center">
          <h2 className="text-destructive text-lg font-semibold">
            Failed to load gallery
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Redirecting to bio links...
          </p>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return loadingState;
  }

  // Handle no data state
  if (!gallery) {
    return null;
  }

  // Render gallery table
  return (
    <div className={CONTAINER_CLASSES}>
      <GalleryLinkTable
        gallery={gallery}
        username={username}
        isLoading={isLoading}
        mutate={mutate}
      />
    </div>
  );
}
