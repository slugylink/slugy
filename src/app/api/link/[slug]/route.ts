import { NextRequest } from "next/server";
import { sql } from "@/server/neon";
import { jsonWithETag } from "@/lib/http";

const getCachedLink = async (slug: string, domain: string = "slugy.co") => {
  try {
    // Use SQL query instead of Prisma
    const result = await sql`
      SELECT id, url, "expiresAt", "expirationUrl", password, "workspaceId", domain
      FROM "links"
      WHERE slug = ${slug} AND domain = ${domain} AND "isArchived" = false
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
          domain: result[0].domain,
        }
      : null;

    return link;
  } catch (error) {
    console.error("Error in getCachedLink:", error);
    // Fallback to direct SQL query
    try {
      const result = await sql`
        SELECT id, url, "expiresAt", "expirationUrl", password, "workspaceId", domain
        FROM "links"
        WHERE slug = ${slug} AND domain = ${domain} AND "isArchived" = false
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
            domain: result[0].domain,
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
    const domain = req.nextUrl.searchParams.get("domain") || "slugy.co";

    if (!isValidSlug(shortCode)) {
      return jsonWithETag(req, {
        success: false,
        url: `${req.nextUrl.origin}/?status=invalid`,
      });
    }

    const link = await getCachedLink(shortCode, domain);

    if (!link) {
      return jsonWithETag(req, {
        success: true,
        url: `${req.nextUrl.origin}/?status=not-found`,
      });
    }

    // expiration
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      const expirationUrl =
        link.expirationUrl || `${req.nextUrl.origin}/?status=expired`;
      return jsonWithETag(req, {
        success: true,
        url: expirationUrl,
        expired: true,
      });
    }

    // Handle password protection
    if (link.password) {
      const cookieHeader = req.headers.get("cookie");
      const cookies = parseCookies(cookieHeader);
      const passwordVerified = cookies[`password_verified_${link.domain}_${shortCode}`];

      if (!passwordVerified) {
        return jsonWithETag(req, {
          success: true,
          url: null,
          requiresPassword: true,
        });
      }
    }

    return jsonWithETag(req, {
      success: true,
      url: link.url,
      linkId: link.id,
      workspaceId: link.workspaceId,
    });
  } catch (error) {
    console.error("Error getting link:", error);
    return jsonWithETag(req, {
      success: false,
      url: `${req.nextUrl.origin}/?status=error`,
    });
  }
}
