"use client";

import React from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { fetcher } from "@/lib/fetcher";
import { useRouter } from "next/navigation";

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

export default function GalleryClient({ username }: { username: string }) {
  const router = useRouter();
  const {
    data: gallery,
    isLoading,
    mutate,
  } = useSWR<Gallery, ApiError>(`/api/bio-gallery/${username}`, fetcher);

  if (isLoading)
    return (
      <div className="flex min-h-[80vh] w-full items-center justify-center">
        <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  if (!gallery) {
    router.push("/bio-links");
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
