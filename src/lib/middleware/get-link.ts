import { sql } from "@/server/neon";
import { redis } from "@/lib/redis";

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

export interface GetLinkResult {
  success: boolean;
  url?: string | null;
  linkId?: string;
  workspaceId?: string;
  requiresPassword?: boolean;
  expired?: boolean;
}

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

  const cacheKey = `link:${slug}`;

  let link: {
    id: string;
    url: string;
    expiresAt: string | null;
    expirationUrl: string | null;
    password: string | null;
    workspaceId: string;
  } | null = null;

  // Try to get from cache
  try {
    const cached = await redis.get(cacheKey);
    console.log("Redis GET result (cache read) 🔥:", cached);
    if (cached) {
      link = typeof cached === "string" ? JSON.parse(cached) : cached;
    }
  } catch (err) {
    console.error("Redis GET error (cache read):", err);
  }

  //If miss, load from SQL
  if (!link) {
    try {
      // console.log("SQL GET result (cache miss) 🔥:");
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

      // If found, set in cache
      if (link) {
        await redis.set(cacheKey, JSON.stringify(link), {
          ex: 60 * 60 * 23, // 23 hours
        });
      }
    } catch (error) {
      console.error("Error in SQL (getLink):", error);
      return {
        success: false,
        url: origin ? `${origin}/?status=error` : undefined,
      };
    }
  }

  // not found
  if (!link) {
    return {
      success: true,
      url: origin ? `${origin}/?status=not-found` : undefined,
    };
  }

  //Check expiration
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    const expirationUrl =
      link.expirationUrl || (origin ? `${origin}/?status=expired` : undefined);
    return {
      success: true,
      url: expirationUrl,
      expired: true,
    };
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

  // Final result
  return {
    success: true,
    url: link.url,
    linkId: link.id,
    workspaceId: link.workspaceId,
  };
}
