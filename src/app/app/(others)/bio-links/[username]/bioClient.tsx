"use client";

import { useEffect } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { LoaderCircle } from "@/utils/icons/loader-circle";
import { fetcher } from "@/lib/fetcher";
import { useRouter } from "next/navigation";

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

  const {
    data: gallery,
    isLoading,
    error,
    mutate,
  } = useSWR<Gallery, ApiError>(`/api/bio-gallery/${username}`, fetcher);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        router.push("/bio-links");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [error, router]);

  useEffect(() => {
    if (!gallery && !isLoading && !error) {
      router.push("/bio-links");
    }
  }, [gallery, isLoading, error, router]);

  if (error) {
    console.error("Gallery loading error:", error);

    return (
      <div className="flex min-h-[80vh] w-full flex-col items-center justify-center">
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

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] w-full items-center justify-center">
        <LoaderCircle className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!gallery) {
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
