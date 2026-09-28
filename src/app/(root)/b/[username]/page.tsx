import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveGalleryTheme } from "@/constants/theme";
import {
  createBioDefaultMetadata as createDefaultMetadata,
  createBioGalleryMetadata as createGalleryMetadata,
  createBioNotFoundMetadata as createNotFoundMetadata,
  getPublicBioGallery,
} from "@/server/public-bio-gallery";
import { getAvatarUrl } from "@/utils/bio-links";
import GalleryLinksProfileClient from "./page-client";

export const revalidate = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageParams {
  params: Promise<{ username: string }>;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function GalleryLinksProfile({ params }: PageParams) {
  const { username } = await params;
  if (!username) notFound();

  const gallery = await getPublicBioGallery(username);
  if (!gallery) {
    notFound();
  }

  return (
    <GalleryLinksProfileClient
      gallery={gallery}
      theme={resolveGalleryTheme(gallery.theme)}
      avatarUrl={getAvatarUrl(gallery.logo, username)}
    />
  );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  try {
    const { username } = await params;
    if (!username) return createNotFoundMetadata();

    const gallery = await getPublicBioGallery(username);
    if (!gallery) return createNotFoundMetadata();

    return createGalleryMetadata({
      name: gallery.name,
      bio: gallery.bio,
      username: gallery.username,
    });
  } catch {
    return createDefaultMetadata();
  }
}
