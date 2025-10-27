import { sql } from "@/server/neon";
import { getLinkCache, setLinkCache } from "@/lib/cache-utils/link-cache";

// Cookie parser utility - optimized with better parsing
const parseCookies = (cookieHeader: string | null): Record<string, string> => {
  if (!cookieHeader) return {};

  try {
    return cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        if (key && value) acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );
  } catch {
    return {};
  }
};

// Validation utility - more robust validation
const isValidSlug = (slug: string): boolean =>
  Boolean(
    slug &&
      slug.length <= 50 &&
      slug.length > 0 &&
      /^[a-zA-Z0-9_-]+$/.test(slug),
  );

export interface GetLinkResult {
  success: boolean;
  url?: string | null;
  linkId?: string;
  workspaceId?: string;
  requiresPassword?: boolean;
  expired?: boolean;
  error?: string;
  title?: string | null;
  image?: string | null;
  metadesc?: string | null;
  description?: string | null;
}

type LinkCacheType = {
  id: string;
  url: string;
  expiresAt: string | null;
  expirationUrl: string | null;
  password: string | null;
  workspaceId: string;
  domain: string;
  title: string | null;
  image: string | null;
  metadesc?: string | null;
  description: string | null;
} | null;

export async function getLink(
  slug: string,
  cookieHeader?: string | null,
  origin?: string,
  domain?: string,
): Promise<GetLinkResult> {
  // Early validation
  if (!isValidSlug(slug)) {
    return {
      success: false,
      url: origin ? `${origin}/?status=invalid` : undefined,
      error: "Invalid slug format",
    };
  }

  let link: LinkCacheType = null;

  try {
    // Cache read with error handling
    link = await getLinkCache(slug, domain || "slugy.co").catch(() => null);

    // Cache miss: fetch from SQL and set cache
    if (!link) {
      const result = await sql`
        SELECT 
          l.id, 
          l.url, 
          l."expiresAt", 
          l."expirationUrl", 
          l.password, 
          l."workspaceId",
          l.domain,
          l.title,
          l.image,
          l.metadesc,
          l.description,
          cd.domain as custom_domain
        FROM "links" l
        LEFT JOIN "custom_domains" cd ON l."customDomainId" = cd.id
        WHERE l.slug = ${slug} 
          AND (
            l.domain = ${domain || "slugy.co"}
            OR cd.domain = ${domain || "slugy.co"}
          )
          AND l."isArchived" = false
        LIMIT 1
      `;

      if (result && result.length > 0) {
        const row = result[0];
        link = {
          id: row.id,
          url: row.url,
          expiresAt: row.expiresAt ?? null,
          expirationUrl: row.expirationUrl ?? null,
          password: row.password ?? null,
          workspaceId: row.workspaceId,
          domain: row.custom_domain || row.domain,
          title: row.title ?? null,
          image: row.image ?? null,
          metadesc: row.metadesc ?? null,
          description: row.description ?? null,
        };

        // Set cache asynchronously (don't block the response)
        setLinkCache(slug, link, domain || "slugy.co").catch(console.error);
      }
    }

    if (!link) {
      return {
        success: true,
        url: origin ? `${origin}/?status=not-found` : undefined,
        error: "Link not found",
      };
    }

    // Check expiration with better date handling
    if (link.expiresAt) {
      const expirationDate = new Date(link.expiresAt);
      const now = new Date();

      if (expirationDate < now) {
        const expirationUrl =
          link.expirationUrl ||
          (origin ? `${origin}/?status=expired` : undefined);

        return {
          success: true,
          url: expirationUrl,
          expired: true,
          error: "Link expired",
        };
      }
    }

    // Password protection with better cookie handling
    if (link.password) {
      const cookies = parseCookies(cookieHeader ?? null);
      const passwordVerified = cookies[`password_verified_${link.domain}_${slug}`];

      if (!passwordVerified) {
        return {
          success: true,
          url: null,
          requiresPassword: true,
          error: "Password required",
        };
      }
    }

    // Success response
    return {
      success: true,
      url: link.url,
      linkId: link.id,
      workspaceId: link.workspaceId,
      title: link.title,
      image: link.image,
      metadesc: link.metadesc ?? null,
      description: link.description,
    };
  } catch (error) {
    console.error(`Error fetching link for slug "${slug}":`, error);

    return {
      success: false,
      url: origin ? `${origin}/?status=error` : undefined,
      error: "Database error",
    };
  }
}
