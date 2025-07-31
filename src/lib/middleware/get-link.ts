import { sql } from "@/server/neon";
import { getLinkCache, setLinkCache } from "@/lib/cache-utils/link-cache";

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
const isValidSlug = (slug: string): boolean =>
  Boolean(slug && slug.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(slug));

export interface GetLinkResult {
  success: boolean;
  url?: string | null;
  linkId?: string;
  workspaceId?: string;
  requiresPassword?: boolean;
  expired?: boolean;
}

type LinkCacheType = {
  id: string;
  url: string;
  expiresAt: string | null;
  expirationUrl: string | null;
  password: string | null;
  workspaceId: string;
} | null;

export async function getLink(
  slug: string,
  cookieHeader?: string | null,
  origin?: string,
): Promise<GetLinkResult> {
  if (!isValidSlug(slug)) {
    return {
      success: false,
      url: origin ? `${origin}/?status=invalid` : undefined,
    };
  }

  let link: LinkCacheType = null;

  // Cache read (fail silently if redis unavailable)
  link = await getLinkCache(slug);

  // Cache miss: fetch from SQL and set cache
  if (!link) {
    try {
      const result = await sql`
        SELECT id, url, "expiresAt", "expirationUrl", password, "workspaceId"
        FROM "links"
        WHERE slug = ${slug} AND "isArchived" = false
        LIMIT 1
      `;
      link = result[0]
        ? {
            id: result[0].id,
            url: result[0].url,
            expiresAt: result[0].expiresAt ?? null,
            expirationUrl: result[0].expirationUrl ?? null,
            password: result[0].password ?? null,
            workspaceId: result[0].workspaceId,
          }
        : null;
      if (link) {
        await setLinkCache(slug, link);
      }
    } catch {
      return {
        success: false,
        url: origin ? `${origin}/?status=error` : undefined,
      };
    }
  }

  if (!link) {
    return {
      success: true,
      url: origin ? `${origin}/?status=not-found` : undefined,
    };
  }

  // Check expiration
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    const expirationUrl =
      link.expirationUrl || (origin ? `${origin}/?status=expired` : undefined);
    return { success: true, url: expirationUrl, expired: true };
  }

  // Password protection
  if (link.password) {
    const cookies = parseCookies(cookieHeader ?? null);
    const passwordVerified = cookies[`password_verified_${slug}`];
    if (!passwordVerified) {
      return {
        success: true,
        url: null,
        requiresPassword: true,
      };
    }
  }

  // Success
  return {
    success: true,
    url: link.url,
    linkId: link.id,
    workspaceId: link.workspaceId,
  };
}
