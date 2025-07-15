"use client";

import React from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { fetcher } from "@/lib/fetcher";

const GalleryLinkTable = dynamic(
  () => import("@/components/web/_bio-links/glinks-table"),
  {
    ssr: true,
  },
);

interface Link {
  id: string;
  title: string;
  url: string;
  isPublic: boolean;
  position: number;
  clicks: number;
  galleryId: string;
}

interface Gallery {
  links: Link[];
  username: string;
  name?: string | null;
  bio?: string | null;
  logo?: string | null;
  socials?: {
    platform: string;
    url?: string;
    isPublic?: boolean;
  }[];
  theme?: string;
}

interface ApiError extends Error {
  info?: {
    error?: string;
  };
}
const ErrorState = ({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry: () => void;
}) => (
  <div className="container mx-auto py-8">
    <div className="text-center">
      <h2 className="text-lg font-semibold">Error loading gallery</h2>
      <p className="text-muted-foreground text-sm">
        {error.info?.error ?? error.message ?? "Please try refreshing the page"}
      </p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Try Again
      </button>
    </div>
  </div>
);

export default function GalleryClient({ username, workspaceSlug }: { username: string; workspaceSlug: string }) {
  const {
    data: gallery,
    error,
    isLoading,
    mutate,
  } = useSWR<Gallery, ApiError>(`/api/bio-gallery/${username}`, fetcher);

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (isLoading)
    return (
      <div className="flex min-h-[80vh] w-full items-center justify-center">
        <LoaderCircle className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  if (!gallery) {
    if (typeof window !== "undefined") {
      window.location.href = `/${workspaceSlug}/bio-gallery/create-gallery`;
    }
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <GalleryLinkTable
        gallery={gallery}
        username={username}
        isLoading={isLoading}
        mutate={mutate}
      />
    </div>
  );
} 