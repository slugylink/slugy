"use client";

import React from "react";
import GalleryLinkPreview from "./glink-preview";
import Actions from "./glink-actions";
import DraggableLinks from "./draggable-links";
import { cn } from "@/lib/utils";
import { KeyedMutator } from "swr";

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
  isLoading,
  mutate,
}: GalleryLinkTableProps) => {
  if (!gallery) return null;

  const publicLinks = gallery.links.filter((link) => link.isPublic);
  const publicSocials = gallery.socials?.filter((s) => s.isPublic) ?? [];

  return (
    <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row">
      <div className="w-full overflow-y-auto max-w-[44rem] 3xl:max-w-[50rem]">
        <Actions gallery={gallery} username={username} mutate={mutate} />
        <DraggableLinks
          links={gallery.links}
          username={username}
          mutate={mutate}
        />
      </div>

      <div className="fixed right-4 top-1 h-full hidden w-[425px] lg:block border-l bg-transparent dark:bg-zinc-900">
        <div
          className={cn(
            isLoading
              ? "animate-pulse backdrop-blur-sm"
              : "flex h-full items-center justify-center py-8",
          )}
        >
          <GalleryLinkPreview
            username={username}
            links={publicLinks}
            socials={publicSocials}
            name={gallery.name}
            bio={gallery.bio}
            logo={gallery.logo}
            initialTheme={gallery.theme ?? "default"}
          />
        </div>          
      </div>
    </div>
  );
};

export default GalleryLinkTable;
