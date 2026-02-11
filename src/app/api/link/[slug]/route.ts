import { NextRequest } from "next/server";
import { sql } from "@/server/neon";
import { jsonWithETag } from "@/lib/http";

const SLUG_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_SLUG_LENGTH = 50;
const DEFAULT_DOMAIN = "slugy.co";

interface LinkData {
  id: string;
  url: string;
  expiresAt: Date | null;
  expirationUrl: string | null;
  password: string | null;
  workspaceId: string;
  domain: string;
}

interface LinkResponse {
  success: boolean;
  url?: string | null;
  linkId?: string;
  workspaceId?: string;
  expired?: boolean;
  requiresPassword?: boolean;
}

// Validate slug format
const isValidSlug = (slug: string): boolean => {
  return Boolean(
    slug && slug.length <= MAX_SLUG_LENGTH && SLUG_REGEX.test(slug),
  );
};

// Parse cookies from header
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

// Fetch link from database
const getCachedLink = async (
  slug: string,
  domain: string,
): Promise<LinkData | null> => {
  try {
    const result = await sql`
      SELECT id, url, "expiresAt", "expirationUrl", password, "workspaceId", domain
      FROM "links"
      WHERE slug = ${slug} AND domain = ${domain} AND "isArchived" = false
      LIMIT 1
    `;

    if (!result[0]) return null;

    return {
      id: result[0].id,
      url: result[0].url,
      expiresAt: result[0].expiresAt ?? null,
      expirationUrl: result[0].expirationUrl ?? null,
      password: result[0].password ?? null,
      workspaceId: result[0].workspaceId,
      domain: result[0].domain,
    };
  } catch (error) {
    console.error("Error in getCachedLink:", error);
    return null;
  }
};

// Check if link has expired
const isLinkExpired = (expiresAt: Date | null): boolean => {
  return Boolean(expiresAt && new Date(expiresAt) < new Date());
};

// Verify password cookie
const isPasswordVerified = (
  cookies: Record<string, string>,
  domain: string,
  slug: string,
): boolean => {
  return Boolean(cookies[`password_verified_${domain}_${slug}`]);
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const origin = req.nextUrl.origin;

  try {
    const { slug } = await params;
    const domain = req.nextUrl.searchParams.get("domain") || DEFAULT_DOMAIN;

    // Validate slug
    if (!slug || !isValidSlug(slug)) {
      return jsonWithETag(req, {
        success: false,
        url: `${origin}/?status=invalid`,
      } as LinkResponse);
    }

    // Fetch link
    const link = await getCachedLink(slug, domain);

    if (!link) {
      return jsonWithETag(req, {
        success: true,
        url: `${origin}/?status=not-found`,
      } as LinkResponse);
    }

    // Check expiration
    if (isLinkExpired(link.expiresAt)) {
      return jsonWithETag(req, {
        success: true,
        url: link.expirationUrl || `${origin}/?status=expired`,
        expired: true,
      } as LinkResponse);
    }

    // Check password protection
    if (link.password) {
      const cookies = parseCookies(req.headers.get("cookie"));

      if (!isPasswordVerified(cookies, link.domain, slug)) {
        return jsonWithETag(req, {
          success: true,
          url: null,
          requiresPassword: true,
        } as LinkResponse);
      }
    }

    // Return successful link
    return jsonWithETag(req, {
      success: true,
      url: link.url,
      linkId: link.id,
      workspaceId: link.workspaceId,
    } as LinkResponse);
  } catch (error) {
    console.error("Error getting link:", error);
    return jsonWithETag(req, {
      success: false,
      url: `${origin}/?status=error`,
    } as LinkResponse);
  }
}
