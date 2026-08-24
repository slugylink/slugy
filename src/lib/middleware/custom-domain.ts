import { NextRequest, NextResponse } from "next/server";
import { handleTempRedirect } from "./temp-redirect";
import { URLRedirects } from "./redirection";

/**
 * Custom domains: one redirect path via getLink(slug, domain).
 * No preflight SELECTs — getLink already joins custom_domains.
 */
export async function handleCustomDomainRequest(
  req: NextRequest,
  hostname: string,
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  const shortCode = pathname.slice(1);
  const hostNoPort = hostname.split(":")[0].toLowerCase();

  if (
    pathname === "/" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(pathname)
  ) {
    return null;
  }

  if (!shortCode) {
    return null;
  }

  if (shortCode.endsWith("&c")) {
    const tempRedirect = await handleTempRedirect(req, shortCode);
    if (tempRedirect) return tempRedirect;
  }

  // Single lookup: Redis → Neon (slug + custom domain join inside getLink)
  return URLRedirects(req, shortCode, hostNoPort);
}

/** @deprecated no-op kept for webhook callers */
export function clearDomainCache(_domain?: string) {
  // Domain verification cache removed — redirect path no longer depends on it.
}
