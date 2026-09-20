"use client";

import { useState } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import ShareActions from "@/components/web/_bio-links/bio-actions";
import SocialLinks from "@/components/web/_bio-links/social-links";
import BioLinksList from "@/components/web/_bio-links/bio-links-list";
import GalleryCarousel from "@/components/web/_bio-links/gallery-carousel";
import GalleryViewerDialog from "@/components/web/_bio-links/gallery-viewer-dialog";
import ProfileSection from "@/components/web/_bio-links/profile-section";
import GalleryFooter from "@/components/web/_bio-links/gallery-footer";
import type { GalleryData, Theme } from "@/types/bio-links";

interface PageClientProps {
  gallery: GalleryData;
  theme: Theme;
  avatarUrl: string;
}

export default function GalleryLinksProfileClient({
  gallery,
  theme,
  avatarUrl,
}: PageClientProps) {
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
              layout="split"
            >
              <SocialLinks socials={socials} theme={theme} variant="header" />
            </ProfileSection>
          </div>

          <LazyMotion features={domAnimation}>
            <div className="relative z-10 space-y-4 px-4 pt-6 pb-16">
              {/* <m.div {...fadeUp(0.08, { amount: 0.1, duration: 0.4 })}> */}
              <BioLinksList links={links} theme={theme} />
              {/* </m.div> */}

              {images.length > 0 && (
                <GalleryCarousel
                  images={images}
                  alt={`${gallery.name}'s gallery`}
                  onImageClick={setViewerIndex}
                />
              )}
            </div>
          </LazyMotion>
          <GalleryFooter />
        </div>
      </div>

      <GalleryViewerDialog
        images={images}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        alt={`${gallery.name}'s gallery`}
      />
    </div>
  );
}
