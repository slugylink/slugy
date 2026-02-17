"use client";

import Image from "next/image";
import { motion } from "motion/react";
import ShareActions from "@/components/web/_bio-links/bio-actions";
import SocialLinks from "@/components/web/_bio-links/social-links";
import BioLinksList from "@/components/web/_bio-links/bio-links-list";
import ProfileSection from "@/components/web/_bio-links/profile-section";
import GalleryFooter from "@/components/web/_bio-links/gallery-footer";
import type { GalleryData, Theme } from "@/types/bio-links";

// ─── Animation Helpers ────────────────────────────────────────────────────────

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.4, delay },
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageClientProps {
  gallery: GalleryData;
  theme: Theme;
  avatarUrl: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GalleryLinksProfileClient({
  gallery,
  theme,
  avatarUrl,
}: PageClientProps) {
  const socials = gallery.socials ?? [];
  const links = gallery.links ?? [];

  return (
    <div className="relative min-h-screen w-full overscroll-x-none bg-transparent">
      {/* ── Blurred background image ── */}
      <div className="fixed inset-0 z-0 h-full" aria-hidden="true">
        <Image
          src={avatarUrl}
          alt=""
          fill
          sizes="100vw"
          className="scale-110 object-cover opacity-80 blur-2xl"
        />
      </div>

      {/* ── Dark overlay ── */}
      <div
        className="fixed inset-0 z-0 h-full bg-black/20"
        aria-hidden="true"
      />

      {/* ── Main content ── */}
      <div className="relative z-10 mx-auto w-full bg-transparent md:max-w-lg md:rounded-3xl">
        <div className="relative md:rounded-3xl">
          {/* ── Share button ── */}
          <div className="absolute top-4 right-4 z-20">
            <ShareActions color="text-white" />
          </div>

          {/* ── Hero / cover image ── */}
          <div className="sticky top-0 z-0 h-[480px] overflow-hidden md:mt-8 md:h-[590px] md:rounded-3xl">
            <Image
              src={avatarUrl}
              alt={`${gallery.name}'s profile`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 680px"
            />
          </div>

          {/* ── Profile overlay (name, bio, socials) ── */}
          <div className="relative z-10 -mt-[80svh] h-[80svh]">
            <ProfileSection
              name={gallery.name}
              username={gallery.username}
              bio={gallery.bio}
              theme={theme}
            >
              <SocialLinks socials={socials} theme={theme} />
            </ProfileSection>
          </div>

          {/* ── Links + footer ── */}
          <div className="relative z-10 space-y-4 bg-black px-4 pb-6 text-white sm:pb-7 md:rounded-b-3xl">
            <motion.div {...fadeUp(0.08)}>
              <BioLinksList links={links} theme={theme} />
            </motion.div>

            <motion.div {...fadeUp(0.12)}>
              <GalleryFooter />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
