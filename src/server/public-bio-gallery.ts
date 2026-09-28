import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/server/db";
import {
  getBioPublicCache,
  setBioPublicCache,
} from "@/lib/cache-utils/bio-public-cache";
import { CANONICAL_BASE, OPENGRAPH_IMAGE_URL } from "@/constants/bio-links";
import type {
  CachedBioData,
  GalleryData,
  GalleryMetadataInput,
} from "@/types/bio-links";
import { getDisplayName } from "@/utils/bio-links";

const MAX_USERNAME_LENGTH = 50;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_BIO_LENGTH = 150;
const SEO_BIO_TRUNCATE = 147;

/** Prisma select for public galleries (public rows only, gallery order). */
export const BIO_GALLERY_SELECT = {
  username: true,
  name: true,
  bio: true,
  logo: true,
  theme: true,
  links: {
    where: { isPublic: true },
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      title: true,
      url: true,
      style: true,
      icon: true,
      image: true,
      position: true,
      isPublic: true,
    },
  },
  socials: {
    where: { isPublic: true },
    orderBy: { platform: "asc" as const },
    select: {
      platform: true,
      url: true,
      isPublic: true,
    },
  },
  images: {
    where: { isPublic: true, deletedAt: null },
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      image: true,
      position: true,
      isPublic: true,
    },
  },
} as const;

export function normalizeBioUsername(username: unknown): string | null {
  if (typeof username !== "string") return null;
  const normalized = username.toLowerCase().trim();
  if (
    !normalized ||
    normalized.length > MAX_USERNAME_LENGTH ||
    !USERNAME_REGEX.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function transformCachedBioData(cachedData: CachedBioData): GalleryData {
  return {
    username: cachedData.username,
    name: cachedData.name,
    bio: cachedData.bio,
    logo: cachedData.logo,
    theme: cachedData.theme,
    links: cachedData.links.map((link) => ({
      ...link,
      style: link.style ?? "link",
      icon: link.icon ?? null,
      image: link.image ?? null,
    })),
    socials: cachedData.socials.map((social) => ({
      ...social,
    })),
    images: (cachedData.images ?? []).map((image) => ({ ...image })),
  };
}

export function createCachedBioData(gallery: GalleryData): CachedBioData {
  return {
    username: gallery.username,
    name: gallery.name,
    bio: gallery.bio,
    logo: gallery.logo,
    theme: gallery.theme,
    links: gallery.links.map((link) => ({
      id: link.id,
      title: link.title,
      url: link.url,
      style: link.style,
      icon: link.icon,
      image: link.image,
      position: link.position,
      isPublic: link.isPublic,
    })),
    socials: gallery.socials.map((social) => ({
      platform: social.platform || "",
      url: social.url || "",
      isPublic: social.isPublic,
    })),
    images: (gallery.images ?? []).map((image) => ({
      id: image.id,
      image: image.image,
      position: image.position,
      isPublic: image.isPublic,
    })),
  };
}

export function writePublicBioCache(
  username: string,
  gallery: GalleryData,
): void {
  const cacheData = createCachedBioData(gallery);
  setBioPublicCache(username, {
    ...cacheData,
    links: cacheData.links.map((link) => ({ ...link })),
    socials: cacheData.socials.map((social) => ({ ...social })),
    images: (cacheData.images ?? []).map((image) => ({ ...image })),
  }).catch(() => {
    // Cache write failures should not break gallery responses.
  });
}

/**
 * Direct data access for public bio galleries (cache → DB → stale cache).
 * Pages should call this instead of HTTP-fetching their own API route.
 * Returns null for invalid/unknown usernames and on unrecoverable errors.
 */
export const getPublicBioGallery = cache(
  async (username: string): Promise<GalleryData | null> => {
    const normalizedUsername = normalizeBioUsername(username);
    if (!normalizedUsername) return null;

    try {
      const cachedData = await getBioPublicCache(normalizedUsername);
      if (cachedData) return transformCachedBioData(cachedData);
    } catch {
      // Fall through to the database on cache read failures.
    }

    try {
      const gallery: GalleryData | null = await db.bio.findUnique({
        where: { username: normalizedUsername },
        select: BIO_GALLERY_SELECT,
      });

      if (!gallery) return null;

      writePublicBioCache(normalizedUsername, gallery);
      return gallery;
    } catch (error) {
      console.error(
        `[Public Bio Gallery] Error fetching ${normalizedUsername}:`,
        error,
      );

      try {
        const staleData = await getBioPublicCache(normalizedUsername);
        if (staleData) return transformCachedBioData(staleData);
      } catch {
        // Ignore stale cache lookup failures.
      }

      return null;
    }
  },
);

// ─── Shared SEO metadata ──────────────────────────────────────────────────────

export function createBioNotFoundMetadata(): Metadata {
  return {
    title: "Bio Gallery Not Found | Slugy",
    description: "The requested bio gallery could not be found.",
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function createBioDefaultMetadata(): Metadata {
  return {
    title: "Bio Gallery | Slugy",
    description:
      "Discover and share curated links in bio galleries. Powered by Slugy.",
    keywords: [
      "bio links",
      "link in bio",
      "social media links",
      "curated links",
      "Slugy",
    ],
    openGraph: {
      title: "Bio Gallery | Slugy",
      description:
        "Discover and share curated links in bio galleries. Powered by Slugy.",
      type: "website",
      siteName: "Slugy",
      url: CANONICAL_BASE,
      images: [
        {
          url: OPENGRAPH_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: "Slugy Bio Gallery Preview",
        },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: "Bio Gallery | Slugy",
      description:
        "Discover and share curated links in bio galleries. Powered by Slugy.",
      images: [OPENGRAPH_IMAGE_URL],
      creator: "@slugy",
      site: "@slugy",
    },
  };
}

export function createBioGalleryMetadata({
  name,
  bio,
  username,
}: GalleryMetadataInput): Metadata {
  const displayName = getDisplayName(name, username);
  const title = `${displayName} - Links Gallery | Slugy`;
  const canonicalUrl = `${CANONICAL_BASE}/${username}`;

  const description =
    bio && bio.length > 0
      ? bio.length > MAX_BIO_LENGTH
        ? `${bio.substring(0, SEO_BIO_TRUNCATE)}...`
        : bio
      : `Discover and share curated links in ${displayName}'s gallery. Powered by Slugy.`;

  return {
    title,
    description,
    keywords: [
      "bio links",
      "link in bio",
      "social media links",
      "curated links",
      displayName,
      username,
      "Slugy",
    ],
    authors: [{ name: displayName }],
    creator: displayName,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "Slugy",
      url: canonicalUrl,
      images: [
        {
          url: OPENGRAPH_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: `${displayName}'s Links Gallery Preview`,
        },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OPENGRAPH_IMAGE_URL],
      creator: "@slugy",
      site: "@slugy",
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    other: {
      "article:author": displayName,
      "profile:username": username,
    },
  };
}
