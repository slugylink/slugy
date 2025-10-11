import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/server/neon";
import { handleTempRedirect } from "./temp-redirect";
import { URLRedirects } from "./redirection";

// Cache for custom domain verification
const domainCache = new Map<
  string,
  { verified: boolean; workspaceId: string; timestamp: number }
>();

const CACHE_TTL = 60000; // 1 minute cache

/**
 * Check if a domain is a verified custom domain
 */
export async function isCustomDomain(
  hostname: string
): Promise<{ isCustom: boolean; workspaceId?: string }> {
  try {
    // Check cache first
    const cached = domainCache.get(hostname);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        isCustom: cached.verified,
        workspaceId: cached.workspaceId,
      };
    }

    // Query database using edge-compatible SQL client
    const result = await sql`
      SELECT "workspaceId"
      FROM "custom_domains"
      WHERE domain = ${hostname}
        AND verified = true
        AND "dnsConfigured" = true
      LIMIT 1
    `;

    const domainResult = {
      verified: result.length > 0,
      workspaceId: result.length > 0 ? result[0].workspaceId : "",
      timestamp: Date.now(),
    };

    // Update cache
    domainCache.set(hostname, domainResult);

    return {
      isCustom: domainResult.verified,
      workspaceId: domainResult.workspaceId,
    };
  } catch (error) {
    console.error("Error checking custom domain:", error);
    return { isCustom: false };
  }
}

/**
 * Handle custom domain requests
 */
export async function handleCustomDomainRequest(
  req: NextRequest,
  hostname: string
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  const shortCode = pathname.slice(1);

  // Skip root path, assets, and API routes
  if (
    pathname === "/" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(pathname)
  ) {
    return null;
  }

  // Check if it's a verified custom domain
  const { isCustom, workspaceId } = await isCustomDomain(hostname);

  if (!isCustom || !workspaceId) {
    return null;
  }

  // Handle temp redirect (&c parameter)
  if (shortCode.endsWith("&c")) {
    const tempRedirect = await handleTempRedirect(req, shortCode);
    if (tempRedirect) return tempRedirect;
  }

  // Try to find and redirect to the link
  // We'll pass the domain info to URLRedirects
  const customDomainRedirect = await URLRedirectsWithDomain(
    req,
    shortCode,
    hostname,
    workspaceId
  );

  if (customDomainRedirect) {
    return customDomainRedirect;
  }

  return null;
}

/**
 * Modified URLRedirects to support custom domains
 */
async function URLRedirectsWithDomain(
  req: NextRequest,
  shortCode: string,
  customDomain?: string,
  workspaceId?: string
): Promise<NextResponse | null> {
  try {
    // Check if link exists for this workspace and custom domain
    if (customDomain && workspaceId) {
      const result = await sql`
        SELECT l.id
        FROM "links" l
        LEFT JOIN "custom_domains" cd ON l."customDomainId" = cd.id
        WHERE l.slug = ${shortCode}
          AND l."deletedAt" IS NULL
          AND l."isArchived" = false
          AND l."workspaceId" = ${workspaceId}
          AND (
            cd.domain = ${customDomain}
            OR l."customDomainId" IS NULL
          )
        LIMIT 1
      `;

      if (result.length === 0) {
        return null;
      }
    }

    // Use the existing URLRedirects function for the actual redirect logic
    return await URLRedirects(req, shortCode);
  } catch (error) {
    console.error("Error in URLRedirectsWithDomain:", error);
    return null;
  }
}

/**
 * Clear domain cache (useful for webhook updates)
 */
export function clearDomainCache(domain?: string) {
  if (domain) {
    domainCache.delete(domain);
  } else {
    domainCache.clear();
  }
}

