"use client";

import Actions from "./glink-actions";
import DraggableLinks from "./draggable-links";
import GalleryProfileView, {
  resolveGalleryTheme,
} from "@/components/web/_bio-links/gallery-profile-view";
import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/utils/bio-links";
import type { EditorGallery, GalleryData } from "@/types/bio-links";
import { type KeyedMutator } from "swr";

const CONTAINER_CLASSES =
  "relative flex flex-col items-start justify-between gap-6 lg:flex-row";
const LINKS_CONTAINER_CLASSES = "w-full max-w-lg overflow-y-auto pb-8 lg:mx-0";
const PREVIEW_CONTAINER_CLASSES =
  "sticky top-6 hidden w-full max-w-[425px] lg:block";
const PREVIEW_CONTENT_CLASSES =
  "flex h-full items-center justify-center py-8 lg:py-0 fixed";

interface GalleryLinkTableProps {
  username: string;
  gallery: EditorGallery;
  isLoading?: boolean;
  mutate: KeyedMutator<EditorGallery>;
}

const GalleryLinkTable = ({
  username,
  gallery,
  isLoading = false,
  mutate,
}: GalleryLinkTableProps) => {
  if (!gallery) return null;

  const publicLinks = gallery.links.filter((link) => link.isPublic);
  const publicSocials =
    gallery.socials?.filter((social) => social.isPublic) ?? [];
  const previewThemeId =
    typeof gallery.theme === "string"
      ? gallery.theme
      : (gallery.theme?.id ?? null);

  const previewGallery: GalleryData = {
    username: gallery.username,
    name: gallery.name ?? null,
    bio: gallery.bio ?? null,
    logo: gallery.logo ?? null,
    theme: previewThemeId,
    links: publicLinks.map((link) => ({
      id: link.id,
      title: link.title,
      url: link.url,
      style: link.style ?? "link",
      icon: link.icon ?? null,
      image: link.image ?? null,
      position: link.position,
      isPublic: link.isPublic,
    })),
    socials: publicSocials.map((social) => ({
      platform: social.platform,
      url: social.url ?? null,
      isPublic: Boolean(social.isPublic),
    })),
  };

  const previewContainerClasses = cn(PREVIEW_CONTAINER_CLASSES);
  const previewContentClasses = cn(
    isLoading ? "animate-pulse backdrop-blur-sm" : PREVIEW_CONTENT_CLASSES,
  );

  return (
    <div className={CONTAINER_CLASSES}>
      <div className="mx-auto w-full">
        <div className="mx-auto mb-5 max-w-lg">
          <Actions gallery={gallery} username={username} mutate={mutate} />
        </div>
        <GalleryProfileView
          gallery={previewGallery}
          theme={resolveGalleryTheme(previewThemeId)}
          avatarUrl={getAvatarUrl(gallery.logo ?? null, username)}
          mode="preview"
          showShareActions={false}
        >
          <DraggableLinks
            links={gallery.links ?? []}
            username={username}
            mutate={mutate}
          />
        </GalleryProfileView>
      </div>
    </div>
  );
};

export default GalleryLinkTable;
