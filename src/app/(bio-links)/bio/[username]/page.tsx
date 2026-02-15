import { db } from "@/server/db";
import { themes } from "@/constants/theme";
import ShareActions from "@/components/web/_bio-links/bio-actions";
import SocialLinks from "@/components/web/_bio-links/social-links";
import BioLinksList from "@/components/web/_bio-links/bio-links-list";
import ProfileSection from "@/components/web/_bio-links/profile-section";
import GalleryFooter from "@/components/web/_bio-links/gallery-footer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getBioPublicCache,
  setBioPublicCache,
} from "@/lib/cache-utils/bio-public-cache";
import {
  DEFAULT_THEME_ID,
  CANONICAL_BASE,
  OPENGRAPH_IMAGE_URL,
} from "@/constants/bio-links";
import type {
  CachedBioData,
  GalleryData,
  GalleryMetadataInput,
} from "@/types/bio-links";
import { getDisplayName } from "@/utils/bio-links";
import { headers } from "next/headers";

// Optimized data fetching helper with enhanced caching and error handling
async function getGallery(username: string): Promise<GalleryData | null> {
  if (!username || typeof username !== "string") {
    return null;
  }

  const normalizedUsername = username.toLowerCase().trim();

  // Check if we're in static generation context
  let isStaticGeneration = false;
  try {
    const headersList = await headers();
    // During static generation, some headers may not be available
    isStaticGeneration = !headersList.has("host");
  } catch {
    // If headers() fails, we're likely in static generation
    isStaticGeneration = true;
  }

  try {
    // Skip cache operations during static generation to avoid dynamic server usage
    if (!isStaticGeneration) {
      // Try to get from cache first (only during runtime)
      const cachedData = await getBioPublicCache(normalizedUsername);

      if (cachedData) {
        try {
          return transformCachedData(cachedData);
        } catch {
          // Cache data corrupted, proceed to database
        }
      }
    }

    // Fetch from database with optimized query
    const gallery = await db.bio.findUnique({
      where: { username: normalizedUsername },
      include: {
        links: {
          where: { isPublic: true },
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            url: true,
            image: true,
            icon: true,
            style: true,
            position: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            bioId: true,
            clicks: true,
          },
        },
        socials: {
          where: { isPublic: true },
          orderBy: { platform: "asc" },
          select: {
            id: true,
            platform: true,
            url: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            bioId: true,
          },
        },
      },
    });

    if (gallery && !isStaticGeneration) {
      // Prepare cache data with validation (only during runtime)
      const cacheData: CachedBioData = {
        username: gallery.username,
        name: gallery.name,
        bio: gallery.bio,
        logo: gallery.logo,
        theme: gallery.theme,
        links: gallery.links.map((link) => ({
          id: link.id,
          title: link.title,
          url: link.url,
          position: link.position,
          isPublic: link.isPublic,
        })),
        socials: gallery.socials.map((social) => ({
          platform: social.platform || "",
          url: social.url || "",
          isPublic: social.isPublic,
        })),
      };

      // Cache asynchronously with error handling
      setBioPublicCache(normalizedUsername, {
        ...cacheData,
        links: [...cacheData.links],
        socials: [...cacheData.socials],
      }).catch(() => {
        // Silently handle cache failures
      });
    }

    return gallery;
  } catch (error) {
    console.error(`[Gallery] Error fetching gallery for ${username}:`, error);

    // Fallback: try to get stale cache data even if database fails (only during runtime)
    if (!isStaticGeneration) {
      try {
        const staleData = await getBioPublicCache(username);
        if (staleData) {
          return transformCachedData(staleData);
        }
      } catch {
        // Silently handle fallback failures
      }
    }

    return null;
  }
}

// Transform cached data to match GalleryData structure
function transformCachedData(cachedData: CachedBioData): GalleryData {
  return {
    username: cachedData.username,
    name: cachedData.name,
    bio: cachedData.bio,
    logo: cachedData.logo,
    theme: cachedData.theme,
    links: cachedData.links.map((link) => ({
      ...link,
      image: null,
      icon: null,
      style: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      bioId: cachedData.username,
      clicks: 0,
    })),
    socials: cachedData.socials.map((social, index) => ({
      ...social,
      id: `cached-${social.platform}-${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      bioId: cachedData.username,
    })),
  };
}

// Theme helper function
function getTheme(themeId: string | null | undefined) {
  const theme =
    themes.find((t) => t.id === themeId) ||
    themes.find((t) => t.id === DEFAULT_THEME_ID) ||
    themes[0];

  // Ensure theme has valid properties as fallback
  if (!theme.background || !theme.textColor || !theme.buttonStyle) {
    return themes.find((t) => t.id === DEFAULT_THEME_ID) || themes[0];
  }

  return theme;
}

// Optimized Main Server Component
export default async function GalleryLinksProfile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
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
    const socials = gallery.socials ?? [];
    const links = gallery.links ?? [];

    return (
      <div className="h-full min-h-screen w-full bg-transparent">
        {/* Background */}
        <div
          className={`fixed top-0 left-0 h-screen w-full ${theme.background} z-0`}
          aria-hidden="true"
        />

        {/* Main Content */}
        <div className="relative z-10 container mx-auto h-full min-h-[90vh] max-w-md px-4 py-8">
          {/* Share Actions */}
          <div className="mx-auto flex justify-end px-0">
            <ShareActions color={theme.textColor} />
          </div>

          {/* Profile Section */}
          <ProfileSection
            name={gallery.name}
            username={gallery.username}
            bio={gallery.bio}
            logo={gallery.logo}
            theme={theme}
          />

          {/* Social Links */}
          <div className="mx-auto mt-6">
            <SocialLinks socials={socials} theme={theme} />
          </div>

          {/* Bio Links */}
          <BioLinksList links={links} theme={theme} />
        </div>

        {/* Footer */}
        <GalleryFooter theme={theme} />
      </div>
    );
  } catch (error) {
    console.error("Error rendering gallery profile:", error);
    notFound();
  }
}

// Static generation for better performance
export async function generateStaticParams() {
  try {
    // Generate static params for popular bio profiles
    const popularProfiles = await db.bio.findMany({
      where: {
        links: {
          some: {
            isPublic: true,
          },
        },
      },
      select: {
        username: true,
      },
      take: 100, // Limit to prevent excessive static generation
      orderBy: {
        updatedAt: "desc",
      },
    });

    return popularProfiles.map((profile) => ({
      username: profile.username,
    }));
  } catch {
    return [];
  }
}

// Optimized metadata generation with better SEO and caching
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  try {
    const { username } = await params;

    if (!username) {
      return createNotFoundMetadata();
    }

    const normalizedUsername = username.toLowerCase().trim();

    // Check if we're in static generation context
    let isStaticGeneration = false;
    try {
      const headersList = await headers();
      isStaticGeneration = !headersList.has("host");
    } catch {
      isStaticGeneration = true;
    }

    // Skip cache operations during static generation
    if (!isStaticGeneration) {
      const cachedData = await getBioPublicCache(normalizedUsername);
      if (cachedData) {
        return createGalleryMetadata({
          name: cachedData.name,
          bio: cachedData.bio,
          username: cachedData.username,
        });
      }
    }

    // Fallback to database
    const gallery = await db.bio.findUnique({
      where: { username: normalizedUsername },
      select: {
        name: true,
        bio: true,
        username: true,
      },
    });

    if (!gallery) {
      return createNotFoundMetadata();
    }

    return createGalleryMetadata(gallery);
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
      images: [
        {
          url: OPENGRAPH_IMAGE_URL,
          alt: "Slugy Bio Gallery Preview",
        },
      ],
      creator: "@slugy",
      site: "@slugy",
    },
  };
}

function createGalleryMetadata(gallery: GalleryMetadataInput): Metadata {
  const displayName = getDisplayName(gallery.name, gallery.username);
  const title = `${displayName} - Links Gallery | Slugy`;

  // Truncate bio for better SEO (160 characters max for meta description)
  const truncatedBio = gallery.bio
    ? gallery.bio.length > 150
      ? `${gallery.bio.substring(0, 147)}...`
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
      images: [
        {
          url: OPENGRAPH_IMAGE_URL,
          alt: `${displayName}'s Links Gallery Preview`,
        },
      ],
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
    verification: {
      google: "your-google-verification-code",
    },
    other: {
      "article:author": displayName,
      "profile:username": gallery.username,
    },
  };
}
