import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import { getCache, setCache } from "@/lib/redis";

const CACHE_PREFIX = "link:";
const CACHE_EXPIRY = 60 * 60 * 24; // 1 day

const getCachedLink = async (slug: string) => {
  const cacheKey = `${CACHE_PREFIX}${slug}`;

  try {
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return cachedData as {
        id: string;
        url: string;
        expiresAt: string | null;
        expirationUrl: string | null;
        password: string | null;
        workspaceId: string;
      };
    }

    const link = await db.link.findFirst({
      where: {
        slug: slug,
        isArchived: false,
      },
      select: {
        id: true,
        url: true,
        expiresAt: true,
        expirationUrl: true,
        password: true,
        workspaceId: true,
      },
    });

    // Cache the result
    if (link) {
      await setCache(cacheKey, link, CACHE_EXPIRY);
    } else {
      await setCache(cacheKey, null, 60 * 5); // 5 minutes
    }

    return link;
  } catch (error) {
    console.error("Error in getCachedLink:", error);
    // Fallback to direct DB query
    return await db.link.findUnique({
      where: {
        slug: slug,
        isArchived: false,
      },
      select: {
        id: true,
        url: true,
        expiresAt: true,
        expirationUrl: true,
        password: true,
        workspaceId: true,
      },
    });
  }
};

// Cookie parser utility
const parseCookies = (cookieHeader: string | null): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );
};

// Validation utility
const isValidSlug = (slug: string): boolean => {
  return Boolean(slug && slug.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(slug));
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: shortCode } = await params;

    if (!isValidSlug(shortCode)) {
      return NextResponse.json({
        success: false,
        url: `${req.nextUrl.origin}/?status=invalid`,
      });
    }

    const link = await getCachedLink(shortCode);

    if (!link) {
      return NextResponse.json({
        success: true,
        url: `${req.nextUrl.origin}/?status=not-found`,
      });
    }

    // expiration
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      const expirationUrl =
        link.expirationUrl || `${req.nextUrl.origin}/?status=expired`;
      return NextResponse.json({
        success: true,
        url: expirationUrl,
        expired: true,
      });
    }

    // Handle password protection
    if (link.password) {
      const cookieHeader = req.headers.get("cookie");
      const cookies = parseCookies(cookieHeader);
      const passwordVerified = cookies[`password_verified_${shortCode}`];

      if (!passwordVerified) {
        return NextResponse.json({
          success: true,
          url: null,
          requiresPassword: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      url: link.url,
      linkId: link.id,
      workspaceId: link.workspaceId,
    });
  } catch (error) {
    console.error("Error getting link:", error);
    return NextResponse.json({
      success: false,
      url: `${req.nextUrl.origin}/?status=error`,
    });
  }
}
