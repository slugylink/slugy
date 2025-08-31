import { db } from "@/server/db";
import { themes } from "@/constants/theme";
import type { BioLinks, BioSocials } from "@prisma/client";
import Image from "next/image";
import {
  RiFacebookFill,
  RiInstagramLine,
  RiLinkedinFill,
  RiTwitterXFill,
  RiYoutubeFill,
  RiSnapchatFill,
} from "react-icons/ri";
import { LuMail } from "react-icons/lu";
import { CornerDownRight } from "lucide-react";
import ShareActions from "@/components/web/_bio-links/bio-actions";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { getBioPublicCache, setBioPublicCache } from "@/lib/cache-utils/bio-public-cache";

// Theme type that's compatible with all theme objects
type Theme = {
  id: string;
  name: string;
  background: string;
  buttonStyle: string;
  textColor: string;
  accentColor: string;
};

// Constants for better maintainability
const DEFAULT_AVATAR_BASE = "https://avatar.vercel.sh";
const DEFAULT_THEME_ID = "default";
const UTM_REF_PARAM = "ref";
const UTM_REF_VALUE = "slugy.co";
const CANONICAL_BASE = "https://bio.slugy.co";
const OPENGRAPH_IMAGE_URL =
  "https://opengraph.b-cdn.net/production/images/1160136e-9ad9-49c3-832c-80392cf860d7.png?token=Tk-p0tmXKfat-A7zU1aov_tcgG82lYmfeLr-zxR1LpI&height=630&width=1200&expires=33289246448";

// Social platform configuration for better maintainability
const SOCIAL_PLATFORMS = {
  facebook: { icon: RiFacebookFill, isMail: false },
  instagram: { icon: RiInstagramLine, isMail: false },
  twitter: { icon: RiTwitterXFill, isMail: false },
  linkedin: { icon: RiLinkedinFill, isMail: false },
  youtube: { icon: RiYoutubeFill, isMail: false },
  mail: { icon: LuMail, isMail: true },
  snapchat: { icon: RiSnapchatFill, isMail: false },
} as const;

// UTM Parameter Helper with better error handling
function addUTMParams(url: string): string {
  if (!url || typeof url !== "string") return url;

  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set(UTM_REF_PARAM, UTM_REF_VALUE);
    return parsedUrl.toString();
  } catch (error) {
    console.warn("Failed to parse URL for UTM params:", url, error);
    return url;
  }
}

// Social Icons mapping with better type safety
const SOCIAL_ICONS: Record<keyof typeof SOCIAL_PLATFORMS, ReactElement> = {
  facebook: <RiFacebookFill size={20} />,
  instagram: <RiInstagramLine size={20} />,
  twitter: <RiTwitterXFill size={20} />,
  linkedin: <RiLinkedinFill size={20} />,
  youtube: <RiYoutubeFill size={20} />,
  mail: <LuMail size={20} />,
  snapchat: <RiSnapchatFill size={20} />,
};

// Data fetching helper with better error handling and caching
async function getGallery(username: string) {
  if (!username || typeof username !== "string") {
    console.error("Invalid username provided:", username);
    return null;
  }

  try {
    // Try to get from cache first
    const cachedData = await getBioPublicCache(username);
    if (cachedData) {
      console.log(`[Cache] Using cached data for ${username}`);
      return {
        username: cachedData.username,
        name: cachedData.name,
        bio: cachedData.bio,
        logo: cachedData.logo,
        theme: cachedData.theme,
        links: cachedData.links.map(link => ({
          ...link,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          bioId: cachedData.username,
          clicks: 0,
        })),
        socials: cachedData.socials.map(social => ({
          ...social,
          id: `cached-${social.platform}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          bioId: cachedData.username,
        })),
      };
    }

    // Cache miss, fetch from database
    console.log(`[Cache] Cache miss for ${username}, fetching from database`);
    const gallery = await db.bio.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: {
        links: {
          where: { isPublic: true },
          orderBy: { position: "asc" },
        },
        socials: {
          where: { isPublic: true },
          orderBy: { platform: "asc" },
        },
      },
    });

    if (gallery) {
      // Cache the result for future requests
      const cacheData = {
        username: gallery.username,
        name: gallery.name,
        bio: gallery.bio,
        logo: gallery.logo,
        theme: gallery.theme,
        links: gallery.links.map(link => ({
          id: link.id,
          title: link.title,
          url: link.url,
          position: link.position,
          isPublic: link.isPublic,
        })),
        socials: gallery.socials.map(social => ({
          platform: social.platform || "",
          url: social.url || "",
          isPublic: social.isPublic,
        })),
      };

      // Set cache asynchronously (don't block the response)
      setBioPublicCache(username, cacheData).catch(error => {
        console.error(`[Cache] Failed to cache data for ${username}:`, error);
      });
    }

    return gallery;
  } catch (error) {
    console.error("Gallery fetch error:", error);
    return null;
  }
}

// Theme helper function
function getTheme(themeId: string | null | undefined) {
  return (
    themes.find((t) => t.id === themeId) ||
    themes.find((t) => t.id === DEFAULT_THEME_ID) ||
    themes[0]
  );
}

// Social links component for better reusability
function SocialLinks({
  socials,
  theme,
}: {
  socials: BioSocials[];
  theme: Theme;
}) {
  const validSocials = socials.filter(
    (s) => s.platform && s.url && s.platform in SOCIAL_PLATFORMS,
  );

  if (!validSocials.length) return null;

  return (
    <div className={`flex space-x-4 ${theme.textColor}`}>
      {validSocials.map(({ platform, url }) => {
        const platformKey = platform as keyof typeof SOCIAL_PLATFORMS;
        const platformConfig = SOCIAL_PLATFORMS[platformKey];
        const Icon = SOCIAL_ICONS[platformKey];

        if (!Icon || !platformConfig || !url) return null;

        const href =
          platformConfig.isMail && !url.startsWith("mailto:")
            ? `mailto:${url}`
            : url;

        return (
          <a
            key={platform}
            href={href}
            target={platformConfig.isMail ? "_self" : "_blank"}
            rel={platformConfig.isMail ? undefined : "noopener noreferrer"}
            className="transition hover:opacity-80 focus:opacity-80 focus:outline-none"
            aria-label={`${platform} profile`}
          >
            {Icon}
          </a>
        );
      })}
    </div>
  );
}

// Bio links component for better reusability
function BioLinks({ links, theme }: { links: BioLinks[]; theme: Theme }) {
  if (!links.length) {
    return (
      <p className={`text-center ${theme.textColor}`}>No links available.</p>
    );
  }

  return (
    <div className="mt-3 w-full space-y-3 pt-4 text-sm">
      {links.map((link) => (
        <a
          key={link.id}
          href={addUTMParams(link.url)}
          target="_blank"
          rel="noopener noreferrer"
          className={`block w-full rounded-full px-4 py-[10px] text-center transition ${theme.buttonStyle} hover:opacity-90 focus:opacity-90 focus:outline-none`}
          aria-label={`Visit ${link.title || link.url}`}
        >
          {link.title || link.url}
        </a>
      ))}
    </div>
  );
}

// Main Server Component
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
          <div className="flex flex-col items-center space-y-4">
            {/* Profile Image */}
            <div className="relative mt-4">
              <Image
                src={
                  gallery.logo || `${DEFAULT_AVATAR_BASE}/${gallery.username}`
                }
                alt={`${gallery.name || gallery.username}'s profile picture`}
                width={96}
                height={96}
                className="h-[88px] w-[88px] rounded-full object-cover"
                priority
                sizes="88px"
              />
            </div>

            {/* Profile Info */}
            <div className={`space-y-2 text-center ${theme.textColor}`}>
              <h1 className="text-xl font-medium">
                {gallery.name || `@${gallery.username}`}
              </h1>
              {gallery.bio && (
                <p className={`${theme.accentColor} max-w-sm text-sm`}>
                  {gallery.bio}
                </p>
              )}
            </div>

            {/* Social Links */}
            <SocialLinks socials={socials} theme={theme} />

            {/* Bio Links */}
            <BioLinks links={links} theme={theme} />
          </div>
        </div>

        {/* Footer */}
        <footer
          className={`relative bottom-0 z-10 flex items-center justify-center gap-1 py-6 pt-10 ${theme.textColor}`}
        >
          <CornerDownRight size={14} />
          <Link
            href="https://slugy.co"
            className="transition-opacity hover:opacity-80"
            aria-label="Visit Slugy homepage"
          >
            slugy
          </Link>
        </footer>
      </div>
    );
  } catch (error) {
    console.error("Error rendering gallery profile:", error);
    notFound();
  }
}

// Metadata generation with better SEO optimization
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  try {
    const { username } = await params;

    if (!username) {
      return {
        title: "Bio Gallery Not Found | Slugy",
        description: "The requested bio gallery could not be found.",
      };
    }

    const gallery = await db.bio.findUnique({
      where: { username: username.toLowerCase().trim() },
      select: {
        name: true,
        bio: true,
        username: true,
      },
    });

    if (!gallery) {
      return {
        title: "Bio Gallery Not Found | Slugy",
        description: "The requested bio gallery could not be found.",
      };
    }

    const displayName = gallery.name || `@${gallery.username}`;
    const title = `${displayName} - Links Gallery | Slugy`;
    const description =
      gallery.bio ||
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
        "Slugy",
      ],
      authors: [{ name: displayName }],
      creator: displayName,
      openGraph: {
        title,
        description,
        type: "website",
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
        google: "your-google-verification-code", // Add your verification code
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Bio Gallery | Slugy",
      description:
        "Discover and share curated links in bio galleries. Powered by Slugy.",
    };
  }
}
