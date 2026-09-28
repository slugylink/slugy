"use client";

import { useState } from "react";
import ShareActions from "@/components/web/_bio-links/bio-actions";
import SocialLinks from "@/components/web/_bio-links/social-links";
import BioLinksList from "@/components/web/_bio-links/bio-links-list";
import GalleryCarousel from "@/components/web/_bio-links/gallery-carousel";
import GalleryViewerDialog from "@/components/web/_bio-links/gallery-viewer-dialog";
import ProfileSection from "@/components/web/_bio-links/profile-section";
import GalleryFooter from "@/components/web/_bio-links/gallery-footer";
import type { GalleryData, Theme } from "@/types/bio-links";

interface PublicBioPageProps {
  gallery: GalleryData;
  theme: Theme;
  avatarUrl: string;
  /** Root origin for short links, computed server-side from the request host. */
  shortOrigin?: string | null;
}

/**
 * Shared public bio page body (bio.slugy.co/:username and slugy.co/b/:username).
 * Static shell — the only client state is the gallery image viewer index.
 */
export default function PublicBioPage({
  gallery,
  theme,
  avatarUrl,
  shortOrigin,
}: PublicBioPageProps) {
  const socials = gallery.socials ?? [];
  const links = gallery.links ?? [];
  const images = gallery.images ?? [];
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <div
      className={`relative min-h-screen w-full overscroll-x-none bg-fixed ${theme.background}`}
    >
      <div className="relative z-10 mx-auto w-full md:max-w-md">
        <div className="relative">
          <div className="absolute top-4 right-4 z-20">
            <ShareActions color={theme.textColor} />
          </div>

          <div className="px-6 pt-14 pb-2">
            <ProfileSection
              name={gallery.name}
              username={gallery.username}
              bio={gallery.bio}
              theme={theme}
              avatarUrl={avatarUrl}
            >
              <SocialLinks socials={socials} theme={theme} variant="header" />
            </ProfileSection>
          </div>

          <div className="relative z-10 space-y-4 px-4 pt-6 pb-16">
            <BioLinksList
              links={links}
              theme={theme}
              shortOrigin={shortOrigin}
            />

            {images.length > 0 && (
              <GalleryCarousel
                images={images}
                alt={`${gallery.name}'s gallery`}
                onImageClick={setViewerIndex}
              />
            )}
          </div>
          <GalleryFooter />
        </div>
      </div>

      {images.length > 0 && (
        <GalleryViewerDialog
          images={images}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          alt={`${gallery.name}'s gallery`}
        />
      )}
    </div>
  );
}
