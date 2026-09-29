"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { isAxiosError } from "axios";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { useRouter } from "next/navigation";
import type { EditorGallery } from "@/types/bio-links";

const GalleryLinkTable = dynamic(
  () => import("@/components/web/_bio-links/glinks-table"),
  {
    ssr: true,
    loading: () => <GalleryLinkTableSkeleton />,
  },
);

function GalleryLinkTableSkeleton() {
  return (
    <div className="container mx-auto py-8">
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

interface ApiError extends Error {
  info?: {
    error?: string;
  };
}

interface GalleryClientProps {
  username: string;
}

function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

export default function GalleryClient({ username }: GalleryClientProps) {
  const router = useRouter();
  const hasRedirected = useRef(false);

  const {
    data: gallery,
    isLoading,
    error,
    mutate,
  } = useSWR<EditorGallery, ApiError>(`/api/bio-gallery/${username}`, {
    // A deleted gallery will never resolve — don't retry 404s. Retrying
    // replaces the error object each time, which kept resetting the
    // redirect timer below and stranded users on the error screen.
    shouldRetryOnError: (err) => !isNotFoundError(err),
  });

  const isNotFound = isNotFoundError(error);

  useEffect(() => {
    // Missing/deleted gallery: leave once via replace (no history entry
    // back to this dead editor). Guarded so refetches can't re-arm it.
    if (
      (isNotFound || (!gallery && !isLoading && !error)) &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      const timer = setTimeout(() => {
        router.replace("/bio-links");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isNotFound, gallery, isLoading, error, router]);

  if (error && !isNotFound) {
    console.error("Gallery loading error:", error);

    return (
      <div className="flex min-h-[80vh] w-full flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-destructive text-lg font-semibold">
            Failed to load gallery
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => mutate()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] w-full items-center justify-center">
        <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (isNotFound || !gallery) {
    return (
      <div className="flex min-h-[80vh] w-full flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Gallery not found</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            This gallery was deleted or doesn&apos;t exist. Redirecting to bio
            links...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <GalleryLinkTable
        gallery={gallery}
        username={username}
        isLoading={isLoading}
        mutate={mutate}
      />
    </div>
  );
}
