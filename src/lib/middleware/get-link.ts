import { sql } from "@/server/neon";
import { getLinkCache, setLinkCache } from "@/lib/cache-utils/link-cache";

const SLUG_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_SLUG_LENGTH = 50;
const DEFAULT_DOMAIN = "slugy.co";

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

interface LinkCache {
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
}

// Parse cookies from header string
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

// Validate slug format
const isValidSlug = (slug: string): boolean => {
  return Boolean(
    slug &&
      slug.length > 0 &&
      slug.length <= MAX_SLUG_LENGTH &&
      SLUG_REGEX.test(slug),
  );
};

// Fetch link from database
const fetchLinkFromDatabase = async (
  slug: string,
  domain: string,
): Promise<LinkCache | null> => {
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
      AND (l.domain = ${domain} OR cd.domain = ${domain})
      AND l."isArchived" = false
    LIMIT 1
  `;

  if (!result?.[0]) return null;

  const row = result[0];
  return {
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
};

// Check if link has expired
const isLinkExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

// Verify password from cookies
const isPasswordVerified = (
  cookies: Record<string, string>,
  domain: string,
  slug: string,
): boolean => {
  return Boolean(cookies[`password_verified_${domain}_${slug}`]);
};

// Build error response
const errorResponse = (
  url: string | undefined,
  error: string,
  success = false,
): GetLinkResult => ({
  success,
  url,
  error,
});

export async function getLink(
  slug: string,
  cookieHeader?: string | null,
  origin?: string,
  domain: string = DEFAULT_DOMAIN,
): Promise<GetLinkResult> {
  // Validate slug
  if (!isValidSlug(slug)) {
    return errorResponse(
      origin ? `${origin}/?status=invalid` : undefined,
      "Invalid slug format",
    );
  }

  try {
    // Try to get link from cache
    let link = await getLinkCache(slug, domain).catch(() => null);

    // Cache miss - fetch from database
    if (!link) {
      link = await fetchLinkFromDatabase(slug, domain);

      if (link) {
        // Set cache asynchronously (non-blocking)
        setLinkCache(slug, link, domain).catch(console.error);
      }
    }

    // Link not found
    if (!link) {
      return errorResponse(
        origin ? `${origin}/?status=not-found` : undefined,
        "Link not found",
        true,
      );
    }

    // Check expiration
    if (isLinkExpired(link.expiresAt)) {
      return {
        success: true,
        url:
          link.expirationUrl ||
          (origin ? `${origin}/?status=expired` : undefined),
        expired: true,
        error: "Link expired",
      };
    }

    // Check password protection
    if (link.password) {
      const cookies = parseCookies(cookieHeader ?? null);

      if (!isPasswordVerified(cookies, link.domain, slug)) {
        return {
          success: true,
          url: null,
          requiresPassword: true,
          error: "Password required",
        };
      }
    }

    // Return successful link
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

    return errorResponse(
      origin ? `${origin}/?status=error` : undefined,
      "Database error",
    );
  }
}
