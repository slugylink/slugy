"use client";

import Image from "next/image";
import { motion } from "motion/react";
import ShareActions from "@/components/web/_bio-links/bio-actions";
import SocialLinks from "@/components/web/_bio-links/social-links";
import BioLinksList from "@/components/web/_bio-links/bio-links-list";
import ProfileSection from "@/components/web/_bio-links/profile-section";
import FeatureCard from "@/components/web/_bio-links/feature-card";
import GalleryFooter from "@/components/web/_bio-links/gallery-footer";
import GridFeatureCard from "@/components/web/_bio-links/grid-feature-card";
import Contact from "@/components/web/_bio-links/contact";
import type { GalleryData, Theme } from "@/types/bio-links";

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.45, delay },
});

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

  return (
    <div className="relative min-h-screen w-full overscroll-x-none bg-transparent">
      <div className="fixed inset-0 top-0 z-0 h-full">
        <Image
          src={avatarUrl}
          alt=""
          fill
          aria-hidden="true"
          sizes="100vw"
          className="fixed top-0 left-0 z-0 h-screen w-screen scale-110 object-cover opacity-80 blur-2xl"
        />
      </div>

      <div className="fixed inset-0 top-0 z-0 h-full bg-black/40" />

      <div className="relative z-10 mx-auto w-full bg-transparent md:max-w-lg md:rounded-3xl">
        <div className="relative md:rounded-3xl">
          <div className="absolute top-4 right-4 z-20">
            <ShareActions color="text-white" />
          </div>

          <div className="sticky top-0 z-0 h-[500px] overflow-hidden md:mt-8 md:h-[600px] md:rounded-3xl">
            <Image
              src={avatarUrl}
              alt={`${gallery.name}'s profile image`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 680px"
            />
          </div>

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

          <div className="relative z-10 space-y-4 bg-black px-4 pb-6 text-white sm:pb-7">
            <motion.div {...fadeUp(0.15)}>
              <BioLinksList links={links} theme={theme} />
            </motion.div>

            <motion.div {...fadeUp(0.15)}>
              <GridFeatureCard />
            </motion.div>

            <motion.div {...fadeUp(0.2)}>
              <FeatureCard />
            </motion.div>

            <motion.div {...fadeUp(0.25)}>
              <Contact />
            </motion.div>

            <motion.div {...fadeUp(0.3)}>
              <GalleryFooter />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
