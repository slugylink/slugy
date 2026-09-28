import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveGalleryTheme } from "@/constants/theme";
import {
  createBioDefaultMetadata as createDefaultMetadata,
  createBioGalleryMetadata as createGalleryMetadata,
  createBioNotFoundMetadata as createNotFoundMetadata,
  getPublicBioGallery,
} from "@/server/public-bio-gallery";
import { getShortLinkOrigin } from "@/server/bio-short-origin";
import type { GalleryMetadataInput } from "@/types/bio-links";
import { getAvatarUrl } from "@/utils/bio-links";
import PublicBioPage from "@/components/web/_bio-links/public-bio-page";

export const revalidate = 60;

interface PageParams {
  params: Promise<{ username: string }>;
}

export default async function GalleryLinksProfile({ params }: PageParams) {
  try {
    const { username } = await params;

    if (!username) {
      notFound();
    }

    const [gallery, shortOrigin] = await Promise.all([
      getPublicBioGallery(username),
      getShortLinkOrigin(),
    ]);

    if (!gallery) {
      notFound();
    }

    const theme = resolveGalleryTheme(gallery.theme);
    const avatarUrl = getAvatarUrl(gallery.logo, username);

    return (
      <PublicBioPage
        gallery={gallery}
        theme={theme}
        avatarUrl={avatarUrl}
        shortOrigin={shortOrigin}
      />
    );
  } catch (error) {
    console.error("Error rendering gallery profile:", error);
    notFound();
  }
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  try {
    const { username } = await params;

    if (!username) {
      return createNotFoundMetadata();
    }

    const gallery = await getPublicBioGallery(username);

    if (!gallery) {
      return createNotFoundMetadata();
    }

    return createGalleryMetadata({
      name: gallery.name,
      bio: gallery.bio,
      username: gallery.username,
    } satisfies GalleryMetadataInput);
  } catch {
    return createDefaultMetadata();
  }
}
