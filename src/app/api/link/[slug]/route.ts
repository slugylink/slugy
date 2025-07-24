import { NextRequest, NextResponse } from "next/server";
import { getCache, setCache } from "@/lib/redis";
import { sql } from "@/server/neon";

interface Link {
  id: string;
  url: string;
  expiresAt: string | null;
  expirationUrl: string | null;
  password: string | null;
  workspaceId: string;
}

const CACHE_PREFIX = "link:";
const CACHE_EXPIRY = 60 * 60 * 24; // 1 day

const getCachedLink = async (slug: string): Promise<Link | null> => {
  const cacheKey = `${CACHE_PREFIX}${slug}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached as Link;

    const result = await sql`
      SELECT id, url, "expiresAt", "expirationUrl", password, "workspaceId"
      FROM "links"
      WHERE slug = ${slug} AND "isArchived" = false
      LIMIT 1
    `;
    if (!result[0]) {
      await setCache(cacheKey, null, 60 * 5); // Cache null for 5 mins
      return null;
    }

    const link: Link = {
      id: result[0].id,
      url: result[0].url,
      expiresAt: result[0].expiresAt ?? null,
      expirationUrl: result[0].expirationUrl ?? null,
      password: result[0].password ?? null,
      workspaceId: result[0].workspaceId,
    };

    await setCache(cacheKey, link, CACHE_EXPIRY);
    return link;
  } catch (error) {
    console.error("getCachedLink error:", error);
    return null;
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
    const { slug } = await params;

    if (!isValidSlug(slug)) {
      return NextResponse.json({
        success: false,
        url: `${req.nextUrl.origin}/?status=invalid`,
      });
    }

    const link = await getCachedLink(slug);

    if (!link) {
      return NextResponse.json({
        success: true,
        url: `${req.nextUrl.origin}/?status=not-found`,
      });
    }

    // Check expiration
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({
        success: true,
        url: link.expirationUrl ?? `${req.nextUrl.origin}/?status=expired`,
        expired: true,
      });
    }
    // Password Protected
    if (link.password) {
      const cookies = parseCookies(req.headers.get("cookie"));
      const passwordVerified = cookies[`password_verified_${slug}`] === "true";
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
