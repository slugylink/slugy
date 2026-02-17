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

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BIO_LENGTH = 150;
const SEO_BIO_TRUNCATE = 147;
const GALLERY_FETCH_REVALIDATE_SECONDS = 60;
const GALLERY_FETCH_TIMEOUT_MS = 8_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageParams {
  params: Promise<{ username: string }>;
}

// ─── Type Guard ───────────────────────────────────────────────────────────────

function isGalleryData(data: unknown): data is GalleryData {
  if (!data || typeof data !== "object") return false;
  const { username, links, socials } = data as Partial<GalleryData>;
  return (
    typeof username === "string" &&
    Array.isArray(links) &&
    Array.isArray(socials)
  );
}

// ─── API Origin ───────────────────────────────────────────────────────────────

async function getApiOrigin(): Promise<string> {
  try {
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
    const proto = headersList.get("x-forwarded-proto") ?? "https";

    if (!host) return "";

    // Handle subdomain localhost (e.g. tenant.localhost:3000)
    if (host.includes(".localhost")) {
      const port = host.split(":")[1] ?? "3000";
      return `http://localhost:${port}`;
    }

    return `${proto}://${host}`;
  } catch {
    return "";
  }
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

const getGallery = cache(
  async (username: string): Promise<GalleryData | null> => {
    if (!username || typeof username !== "string") return null;

    const normalizedUsername = username.toLowerCase().trim();
    const path = `/api/public/bio-gallery/${encodeURIComponent(normalizedUsername)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      GALLERY_FETCH_TIMEOUT_MS,
    );

    try {
      const apiOrigin = await getApiOrigin();
      const url = apiOrigin ? `${apiOrigin}${path}` : path;

      const response = await fetch(url, {
        signal: controller.signal,
        next: { revalidate: GALLERY_FETCH_REVALIDATE_SECONDS },
      });

      if (response.status === 404) return null;

      if (!response.ok) {
        console.error(
          `[Gallery] API error for "${normalizedUsername}": HTTP ${response.status}`,
        );
        return null;
      }

      const payload: unknown = await response.json();
      return isGalleryData(payload) ? payload : null;
    } catch (error) {
      console.error(`[Gallery] Fetch failed for "${username}":`, error);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },
);

// ─── Theme Resolution ─────────────────────────────────────────────────────────

function getTheme(themeId: string | null | undefined): Theme {
  const defaultTheme =
    themes.find((t) => t.id === DEFAULT_THEME_ID) ?? themes[0];

  const resolved = themes.find((t) => t.id === themeId) ?? defaultTheme;

  // Fallback to default if resolved theme is structurally incomplete
  if (!resolved?.background || !resolved?.textColor || !resolved?.buttonStyle) {
    return defaultTheme;
  }

  return resolved;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function GalleryLinksProfile({ params }: PageParams) {
  try {
    const { username } = await params;
    if (!username) notFound();

    const gallery = await getGallery(username);
    if (!gallery) notFound();

    return (
      <GalleryLinksProfileClient
        gallery={gallery}
        theme={getTheme(gallery.theme)}
        avatarUrl={getAvatarUrl(gallery.logo, username)}
      />
    );
  } catch (error) {
    console.error("[Gallery] Error rendering profile:", error);
    notFound();
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  try {
    const { username } = await params;
    if (!username) return createNotFoundMetadata();

    const gallery = await getGallery(username);
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

// ─── Metadata Factories ───────────────────────────────────────────────────────

function createNotFoundMetadata(): Metadata {
  return {
    title: "Bio Gallery Not Found | Slugy",
    description: "The requested bio gallery could not be found.",
    robots: { index: true, follow: true },
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

function createGalleryMetadata({
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

  const ogImage = {
    url: OPENGRAPH_IMAGE_URL,
    width: 1200,
    height: 630,
    alt: `${displayName}'s Links Gallery Preview`,
  };

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
      images: [ogImage],
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
    alternates: { canonical: canonicalUrl },
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
