"use client";

import { useState } from "react";
import Actions from "./glink-actions";
import DraggableLinks from "./draggable-links";
import ThemePicker from "./theme-picker";
import GalleryCarousel from "./gallery-carousel";
import GallerySettingsDialog from "./gallery-settings-dialog";
import { SocialSettingsDialog } from "./social-settings-dialog";
import GalleryProfileView, {
  resolveGalleryTheme,
} from "@/components/web/_bio-links/gallery-profile-view";
import { getAvatarUrl } from "@/utils/bio-links";
import type { EditorGallery, GalleryData } from "@/types/bio-links";
import { type KeyedMutator } from "swr";

const CONTAINER_CLASSES =
  "relative flex flex-col items-start justify-between gap-6 lg:flex-row";

interface GalleryLinkTableProps {
  username: string;
  gallery: EditorGallery;
  isLoading?: boolean;
  mutate: KeyedMutator<EditorGallery>;
}

const GalleryLinkTable = ({
  username,
  gallery,
  mutate,
}: GalleryLinkTableProps) => {
  // Inline edit entry points inside the preview (same dialogs as the top menu).
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);

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
    images: (gallery.images ?? [])
      .filter((image) => image.isPublic)
      .map((image) => ({
        id: image.id,
        image: image.image,
        position: image.position,
        isPublic: image.isPublic,
      })),
  };

  return (
    <div className={CONTAINER_CLASSES}>
      <div className="mx-auto w-full">
        <div className="mx-auto mb-5 flex max-w-lg items-center gap-2">
          <div className="min-w-0 flex-1">
            <Actions gallery={gallery} username={username} mutate={mutate} />
          </div>
          <ThemePicker
            username={username}
            initialTheme={previewThemeId}
            mutate={mutate}
          />
        </div>
        <GalleryProfileView
          gallery={previewGallery}
          theme={resolveGalleryTheme(previewThemeId)}
          avatarUrl={getAvatarUrl(gallery.logo ?? null, username)}
          mode="preview"
          showShareActions={false}
          editable
          onEditBio={() => setSettingsOpen(true)}
          onEditSocials={() => setSocialOpen(true)}
        >
          <DraggableLinks
            links={gallery.links ?? []}
            username={username}
            mutate={mutate}
          />
          {previewGallery.images.length > 0 && (
            <GalleryCarousel
              images={previewGallery.images}
              alt="Gallery image"
            />
          )}
        </GalleryProfileView>
      </div>

      {/* Inline preview edit dialogs (same as the top pencil menu) */}
      <GallerySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        username={username}
        initialData={gallery}
      />
      <SocialSettingsDialog
        open={socialOpen}
        onOpenChange={setSocialOpen}
        username={username}
        initialData={gallery.socials}
      />
    </div>
  );
};

export default GalleryLinkTable;
