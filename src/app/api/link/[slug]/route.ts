import { NextRequest, NextResponse } from "next/server";
import { getCache, setCache } from "@/lib/redis";
import { sql } from "@/server/neon";

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

    // Use SQL query instead of Prisma
    const result = await sql`
      SELECT id, url, "expiresAt", "expirationUrl", password, "workspaceId"
      FROM "links"
      WHERE slug = ${slug} AND "isArchived" = false
      LIMIT 1
    `;
    const link = result[0]
      ? {
          id: result[0].id,
          url: result[0].url,
          expiresAt: result[0].expiresAt ?? null,
          expirationUrl: result[0].expirationUrl ?? null,
          password: result[0].password ?? null,
          workspaceId: result[0].workspaceId,
        }
      : null;

    // Cache the result
    if (link) {
      await setCache(cacheKey, link, CACHE_EXPIRY);
    } else {
      await setCache(cacheKey, null, 60 * 5); // 5 minutes
    }

    return link;
  } catch (error) {
    console.error("Error in getCachedLink:", error);
    // Fallback to direct SQL query
    try {
      const result = await sql`
        SELECT id, url, "expiresAt", "expirationUrl", password, "workspaceId"
        FROM "links"
        WHERE slug = ${slug} AND "isArchived" = false
        LIMIT 1
      `;
      return result[0]
        ? {
            id: result[0].id,
            url: result[0].url,
            expiresAt: result[0].expiresAt ?? null,
            expirationUrl: result[0].expirationUrl ?? null,
            password: result[0].password ?? null,
            workspaceId: result[0].workspaceId,
          }
        : null;
    } catch (fallbackError) {
      console.error("Fallback SQL error in getCachedLink:", fallbackError);
      return null;
    }
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
