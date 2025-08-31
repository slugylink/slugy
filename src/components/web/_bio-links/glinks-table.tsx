"use client";

import React, { useMemo } from "react";
import GalleryLinkPreview from "./glink-preview";
import Actions from "./glink-actions";
import DraggableLinks from "./draggable-links";
import { cn } from "@/lib/utils";
import { KeyedMutator } from "swr";

// Constants for better maintainability
const CONTAINER_CLASSES =
  "relative flex flex-col items-start justify-between gap-6 lg:flex-row";
const LINKS_CONTAINER_CLASSES =
  "w-full overflow-y-auto max-w-[44rem] 3xl:max-w-[50rem]";
const PREVIEW_CONTAINER_CLASSES =
  "fixed right-4 top-1 h-full hidden w-[425px] lg:block border-l bg-transparent dark:bg-zinc-900";
const PREVIEW_CONTENT_CLASSES = "flex h-full items-center justify-center py-8";

// Types for better type safety
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

interface GalleryLinkTableProps {
  username: string;
  gallery: Gallery;
  isLoading?: boolean;
  mutate: KeyedMutator<Gallery>;
}

const GalleryLinkTable = ({
  username,
  gallery,
  isLoading = false,
  mutate,
}: GalleryLinkTableProps) => {
  // Memoized filtered data for better performance
  const { publicLinks, publicSocials } = useMemo(() => {
    if (!gallery) return { publicLinks: [], publicSocials: [] };

    const publicLinks = gallery.links.filter((link) => link.isPublic);
    const publicSocials = gallery.socials?.filter((s) => s.isPublic) ?? [];

    return { publicLinks, publicSocials };
  }, [gallery?.links, gallery?.socials]);

  // Memoized preview container classes
  const previewContainerClasses = useMemo(
    () => cn(PREVIEW_CONTAINER_CLASSES),
    [],
  );

  // Memoized preview content classes
  const previewContentClasses = useMemo(
    () =>
      cn(
        isLoading ? "animate-pulse backdrop-blur-sm" : PREVIEW_CONTENT_CLASSES,
      ),
    [isLoading],
  );

  // Memoized actions component to prevent unnecessary re-renders
  const actionsComponent = useMemo(
    () => <Actions gallery={gallery!} username={username} mutate={mutate} />,
    [gallery, username, mutate],
  );

  // Memoized draggable links component
  const draggableLinksComponent = useMemo(
    () => (
      <DraggableLinks
        links={gallery?.links ?? []}
        username={username}
        mutate={mutate}
      />
    ),
    [gallery?.links, username, mutate],
  );

  // Memoized preview component
  const previewComponent = useMemo(
    () => (
      <GalleryLinkPreview
        username={username}
        links={publicLinks}
        socials={publicSocials}
        name={gallery?.name}
        bio={gallery?.bio}
        logo={gallery?.logo}
        initialTheme={gallery?.theme ?? "default"}
      />
    ),
    [
      username,
      publicLinks,
      publicSocials,
      gallery?.name,
      gallery?.bio,
      gallery?.logo,
      gallery?.theme,
    ],
  );

  // Early return if no gallery data
  if (!gallery) return null;

  return (
    <div className={CONTAINER_CLASSES}>
      {/* Main content area */}
      <div className={LINKS_CONTAINER_CLASSES}>
        {actionsComponent}
        {draggableLinksComponent}
      </div>

      {/* Preview sidebar */}
      <div className={previewContainerClasses}>
        <div className={previewContentClasses}>{previewComponent}</div>
      </div>
    </div>
  );
};

export default React.memo(GalleryLinkTable);
