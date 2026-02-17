import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { themes } from "@/constants/theme";
import {
  DEFAULT_THEME_ID,
  CANONICAL_BASE,
  OPENGRAPH_IMAGE_URL,
} from "@/constants/bio-links";
import type {
  GalleryData,
  GalleryMetadataInput,
  Theme,
} from "@/types/bio-links";
import { getAvatarUrl, getDisplayName } from "@/utils/bio-links";
import GalleryLinksProfileClient from "./page-client";

const MAX_BIO_LENGTH = 150;
const SEO_BIO_TRUNCATE = 147;
const GALLERY_FETCH_REVALIDATE_SECONDS = 60;
const GALLERY_FETCH_TIMEOUT_MS = 8_000;

function isGalleryData(data: unknown): data is GalleryData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const candidate = data as Partial<GalleryData>;
  return (
    typeof candidate.username === "string" &&
    Array.isArray(candidate.links) &&
    Array.isArray(candidate.socials)
  );
}

async function getApiOrigin(): Promise<string> {
  try {
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") || headersList.get("host") || "";
    const proto = headersList.get("x-forwarded-proto") || "https";

    if (host) {
      // Use loopback origin for local development with custom subdomains
      if (host.includes(".localhost")) {
        const port = host.split(":")[1] || "3000";
        return `http://localhost:${port}`;
      }
      return `${proto}://${host}`;
    }
  } catch {
    // Fallback to empty string
  }
  return "";
}

const getGallery = cache(
  async (username: string): Promise<GalleryData | null> => {
    if (!username || typeof username !== "string") {
      return null;
    }

    const normalizedUsername = username.toLowerCase().trim();
    const path = `/api/public/bio-gallery/${encodeURIComponent(normalizedUsername)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        GALLERY_FETCH_TIMEOUT_MS,
      );
      let response: Response;
      try {
        const apiOrigin = await getApiOrigin();
        const requestUrl = apiOrigin ? `${apiOrigin}${path}` : path;

        response = await fetch(requestUrl, {
          signal: controller.signal,
          next: { revalidate: GALLERY_FETCH_REVALIDATE_SECONDS },
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.error(
          `[Gallery] Public API error for ${normalizedUsername}: ${response.status}`,
        );
        return null;
      }

      const payload: unknown = await response.json();
      return isGalleryData(payload) ? payload : null;
    } catch (error) {
      console.error(
        `[Gallery] Error fetching gallery via API for ${username}:`,
        error,
      );
      return null;
    }
  },
);

function getTheme(themeId: string | null | undefined): Theme {
  const theme =
    themes.find((t) => t.id === themeId) ||
    themes.find((t) => t.id === DEFAULT_THEME_ID) ||
    themes[0];

  if (!theme?.background || !theme?.textColor || !theme?.buttonStyle) {
    return themes.find((t) => t.id === DEFAULT_THEME_ID) || themes[0];
  }

  return theme;
}

interface PageParams {
  params: Promise<{ username: string }>;
}

export default async function GalleryLinksProfile({ params }: PageParams) {
  try {
    const { username } = await params;

    if (!username) {
      notFound();
    }

    const gallery = await getGallery(username);

    if (!gallery) {
      notFound();
    }

    const theme = getTheme(gallery.theme);
    const avatarUrl = getAvatarUrl(gallery.logo, username);

    return (
      <GalleryLinksProfileClient
        gallery={gallery}
        theme={theme}
        avatarUrl={avatarUrl}
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

    const gallery = await getGallery(username);

    if (!gallery) {
      return createNotFoundMetadata();
    }

    return createGalleryMetadata({
      name: gallery.name,
      bio: gallery.bio,
      username: gallery.username,
    });
  } catch {
    return createDefaultMetadata();
  }
}

function createNotFoundMetadata(): Metadata {
  return {
    title: "Bio Gallery Not Found | Slugy",
    description: "The requested bio gallery could not be found.",
    robots: {
      index: true,
      follow: true,
    },
  };
}

function createDefaultMetadata(): Metadata {
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

function createGalleryMetadata(gallery: GalleryMetadataInput): Metadata {
  const displayName = getDisplayName(gallery.name, gallery.username);
  const title = `${displayName} - Links Gallery | Slugy`;

  const truncatedBio = gallery.bio
    ? gallery.bio.length > MAX_BIO_LENGTH
      ? `${gallery.bio.substring(0, SEO_BIO_TRUNCATE)}...`
      : gallery.bio
    : null;

  const description =
    truncatedBio ||
    `Discover and share curated links in ${displayName}'s gallery. Powered by Slugy.`;
  const canonicalUrl = `${CANONICAL_BASE}/${gallery.username}`;

  return {
    title,
    description,
    keywords: [
      "bio links",
      "link in bio",
      "social media links",
      "curated links",
      displayName,
      gallery.username,
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
      "profile:username": gallery.username,
    },
  };
}
