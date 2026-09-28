import { NextRequest, NextResponse } from "next/server";
import { handleTempRedirect } from "./temp-redirect";
import { URLRedirects } from "./redirection";
import { getLink } from "./get-link";

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

  // Branded UI routes (e.g. the password gate) render as pages — they must
  // not resolve as multi-segment slugs (which would 404 them).
  if (pathname.startsWith("/custom-domain/")) {
    return NextResponse.next();
  }

  if (shortCode.endsWith("&c")) {
    const tempRedirect = await handleTempRedirect(req, shortCode);
    if (tempRedirect) return tempRedirect;
  }

  // Single lookup: Redis → Neon (slug + custom domain join inside getLink)
  const redirect = await URLRedirects(req, shortCode, hostNoPort);
  if (redirect) return redirect;

  // Password-protected links can't 302 from middleware — route them to the
  // password gate instead of the branded not-found page. getLink is
  // cache-backed, so this second check rarely touches the DB.
  try {
    const gateCheck = await getLink(
      shortCode,
      req.headers.get("cookie"),
      req.nextUrl.origin,
      hostNoPort,
    );
    if (gateCheck?.requiresPassword) {
      const gateUrl = new URL("/custom-domain/password", req.url);
      gateUrl.searchParams.set("slug", shortCode);
      gateUrl.searchParams.set("domain", hostNoPort);
      const gate = NextResponse.rewrite(gateUrl);
      gate.headers.set("Cache-Control", "private, no-store, max-age=0");
      return gate;
    }
  } catch (error) {
    console.error("Password gate check failed:", error);
  }

  return null;
}

/** @deprecated no-op kept for webhook callers */
export function clearDomainCache(_domain?: string) {
  // Domain verification cache removed — redirect path no longer depends on it.
}
