import { NextRequest, NextResponse } from "next/server";
import { getLink } from "./get-link";
import { detectTrigger } from "./detect-trigger";
import { trackLinkAnalytics } from "./track-analytics";

const REDIRECT_STATUS = 302;

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
}

/**
 * Creates a safe redirect, falling back to a fallback URL if the primary URL is invalid
 */
function createSafeRedirect(url: string, fallbackUrl: string): NextResponse {
  try {
    return NextResponse.redirect(new URL(url), REDIRECT_STATUS);
  } catch (error) {
    console.error(`Invalid redirect URL: ${url}`, error);
    return NextResponse.redirect(new URL(fallbackUrl), REDIRECT_STATUS);
  }
}

/**
 * Serves link preview page with OG tags for social media crawlers
 * Optimized cache headers for social crawlers while preventing browser caching
 */
function serveLinkPreview(
  req: NextRequest,
  slug: string,
  linkData: import("./get-link").GetLinkResult,
): NextResponse {
  const baseUrl = req.nextUrl.origin;
  const title = linkData.title || "Slugy Link";
  const image = linkData.image || `${baseUrl}/logo.svg`;
  const metadesc = linkData.metadesc || "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(metadesc)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(metadesc)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:url" content="${escapeHtml(req.url)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(metadesc)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body></body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Allow social crawlers to cache, but prevent browser caching
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function URLRedirects(
  req: NextRequest,
  shortCode: string,
  domain?: string,
): Promise<NextResponse | null> {
  try {
    if (!shortCode?.trim()) {
      console.warn("Empty shortCode provided to URLRedirects");
      return null;
    }

    const cookieHeader = req.headers.get("cookie") ?? "";
    const origin = req.nextUrl.origin;
    const linkData = await getLink(shortCode, cookieHeader, origin, domain);

    if (!linkData.success) {
      console.warn(
        `Link lookup failed for slug "${shortCode}":`,
        linkData.error,
      );
      return null;
    }

    if (linkData.requiresPassword) {
      return null;
    }

    if (linkData.expired && linkData.url) {
      return createSafeRedirect(linkData.url, `${origin}/?status=expired`);
    }

    if (linkData.url && linkData.linkId && linkData.workspaceId) {
      // Detect trigger and check if this is a bot request
      const trigger = detectTrigger(req);
      const isBot = trigger === "bot";

      // If this is a bot (e.g., social crawler) and we have metadata, serve preview immediately
      // This happens BEFORE analytics to ensure bots don't trigger tracking
      if (isBot && (linkData.title || linkData.image || linkData.metadesc)) {
        return serveLinkPreview(req, shortCode, linkData);
      }

      // Only track analytics for non-bot users
      if (!isBot) {
        void trackLinkAnalytics(req, {
          linkId: linkData.linkId,
          slug: shortCode,
          url: linkData.url,
          workspaceId: linkData.workspaceId,
          domain,
          trigger,
        });
      }

      // Redirect to destination URL with validation
      return createSafeRedirect(linkData.url, `${origin}/?status=error`);
    }

    if (linkData.url?.includes("status=not-found")) {
      return createSafeRedirect(linkData.url, `${origin}/?status=not-found`);
    }

    return null;
  } catch (error) {
    console.error(`Link redirect error for slug "${shortCode}":`, error);
    return null;
  }
}
