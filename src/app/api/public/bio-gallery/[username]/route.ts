import { type NextRequest } from "next/server";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import {
  getBioPublicCache,
  setBioPublicCache,
} from "@/lib/cache-utils/bio-public-cache";
import type { CachedBioData, GalleryData } from "@/types/bio-links";

const CACHE_DURATION = 300;
const STALE_WHILE_REVALIDATE = 600;
const MAX_USERNAME_LENGTH = 50;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

function transformCachedData(cachedData: CachedBioData): GalleryData {
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

function createCacheData(gallery: GalleryData): CachedBioData {
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
  };
}

function isValidUsername(username: string): boolean {
  return (
    username.length > 0 &&
    username.length <= MAX_USERNAME_LENGTH &&
    USERNAME_REGEX.test(username)
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> },
) {
  const params = await context.params;
  const normalizedUsername = params.username?.toLowerCase().trim();

  if (!normalizedUsername || !isValidUsername(normalizedUsername)) {
    return jsonWithETag(
      request,
      { error: "Invalid username format" },
      { status: 400 },
    );
  }

  try {
    const cachedData = await getBioPublicCache(normalizedUsername);
    if (cachedData) {
      return jsonWithETag(request, transformCachedData(cachedData), {
        status: 200,
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
        },
      });
    }

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
            style: true,
            icon: true,
            image: true,
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

    if (!gallery) {
      return jsonWithETag(request, { error: "Bio gallery not found" }, 404);
    }

    const cacheData = createCacheData(gallery);
    setBioPublicCache(normalizedUsername, {
      ...cacheData,
      links: [...cacheData.links],
      socials: [...cacheData.socials],
    }).catch(() => {
      // Cache write failures should not break API responses.
    });

    return jsonWithETag(request, gallery, {
      status: 200,
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      },
    });
  } catch (error) {
    console.error(
      `[Public Bio Gallery API] Error fetching ${normalizedUsername}:`,
      error,
    );

    try {
      const staleData = await getBioPublicCache(normalizedUsername);
      if (staleData) {
        return jsonWithETag(request, transformCachedData(staleData), {
          status: 200,
          headers: {
            "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
          },
        });
      }
    } catch {
      // Ignore stale cache lookup failures.
    }

    return jsonWithETag(
      request,
      { error: "Failed to fetch bio gallery" },
      { status: 500 },
    );
  }
}
