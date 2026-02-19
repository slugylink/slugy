import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse, userAgent } from "next/server";
import { getLink } from "./get-link";
import { detectTrigger } from "./detect-trigger";
import { sendLinkClickEvent } from "@/lib/tinybird/slugy_click_events";
import {
  cacheAnalyticsEvent,
  type CachedAnalyticsData,
} from "@/lib/cache-utils/analytics-cache";
import { redis } from "@/lib/redis";

const REDIRECT_STATUS = 302;
const UNKNOWN_VALUE = "unknown";
const DIRECT_REFERER = "Direct";
const RATE_LIMIT_WINDOW_SECONDS = 8;
const RATE_LIMIT_KEY_PREFIX = "rate_limit:analytics";
const DEFAULT_DOMAIN = "slugy.co";
const DEFAULT_DEVICE = "desktop";
const DEFAULT_BROWSER = "chrome";
const DEFAULT_OS = "windows";

interface AnalyticsData {
  ipAddress: string;
  country: string;
  city: string;
  continent: string;
  referer: string;
  device: string;
  browser: string;
  os: string;
  trigger: string;
}

interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

interface GeoData {
  country: string;
  city: string;
  continent: string;
  region: string;
}

// Safely decode URI component
function safeDecodeURIComponent(value: string | null): string {
  if (!value) return UNKNOWN_VALUE;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Extract geolocation data from headers (Cloudflare/Vercel)
function getGeoData(req: NextRequest): GeoData {
  const headers = req.headers;

  return {
    country:
      (
        headers.get("cf-ipcountry") || headers.get("x-vercel-ip-country")
      )?.toLowerCase() ?? UNKNOWN_VALUE,
    city: safeDecodeURIComponent(
      headers.get("cf-ipcity") || headers.get("x-vercel-ip-city"),
    ),
    continent:
      (
        headers.get("cf-ipcontinent") || headers.get("x-vercel-ip-continent")
      )?.toLowerCase() ?? UNKNOWN_VALUE,
    region:
      headers.get("cf-region") ||
      headers.get("x-vercel-ip-country-region") ||
      UNKNOWN_VALUE,
  };
}

// Escape HTML to prevent XSS
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

// Extract UTM parameters from URL
function extractUTMParams(urlString: string): UTMParams {
  try {
    const params = new URL(urlString).searchParams;
    return {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_term: params.get("utm_term"),
      utm_content: params.get("utm_content"),
    };
  } catch {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };
  }
}

// Create safe redirect with fallback
function createSafeRedirect(url: string, fallbackUrl: string): NextResponse {
  try {
    return NextResponse.redirect(new URL(url), REDIRECT_STATUS);
  } catch (error) {
    console.error(`Invalid redirect URL: ${url}`, error);
    return NextResponse.redirect(new URL(fallbackUrl), REDIRECT_STATUS);
  }
}

// Generate HTML preview page for bots/social media crawlers
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
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

// Check if analytics request should be rate limited
async function checkAnalyticsRateLimit(
  ipAddress: string,
  slug: string,
): Promise<boolean> {
  if (!ipAddress || ipAddress === UNKNOWN_VALUE) return false;

  try {
    const key = `${RATE_LIMIT_KEY_PREFIX}:${ipAddress}:${slug}`;
    const result = await redis.set(key, "1", {
      nx: true,
      ex: RATE_LIMIT_WINDOW_SECONDS,
    });

    const limited = result === null;
    if (limited) {
      console.warn(
        `[Rate Limit] Analytics rate limited for IP ${ipAddress} and slug ${slug}`,
      );
    }
    return limited;
  } catch (error) {
    console.error("[Rate Limit Error]", error);
    return false; // Fail open if Redis fails
  }
}

// Extract IP address from headers
function getIpAddress(req: NextRequest): string {
  const xri = req.headers.get("x-real-ip");
  const xff = req.headers.get("x-forwarded-for");
  return xri || xff?.split(",")[0]?.trim() || UNKNOWN_VALUE;
}

// Build analytics data from request
function buildAnalyticsData(req: NextRequest, trigger: string): AnalyticsData {
  const ua = userAgent(req);
  const geoData = getGeoData(req);
  const refParam = req.nextUrl.searchParams.get("ref")?.trim();
  const referer = refParam
    ? safeDecodeURIComponent(refParam)
    : (req.headers.get("referer") ?? DIRECT_REFERER);

  return {
    ipAddress: getIpAddress(req),
    country: geoData.country,
    city: geoData.city,
    continent: geoData.continent,
    device: ua.device?.type?.toLowerCase() ?? DEFAULT_DEVICE,
    browser: ua.browser?.name?.toLowerCase() ?? DEFAULT_BROWSER,
    os: ua.os?.name?.toLowerCase() ?? DEFAULT_OS,
    referer,
    trigger,
  };
}

// Track analytics asynchronously
async function trackAnalytics(
  req: NextRequest,
  linkId: string,
  slug: string,
  url: string,
  workspaceId: string,
  domain: string | undefined,
  trigger: string,
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const analytics = buildAnalyticsData(req, trigger);
    const utmParams = extractUTMParams(url);
    const finalDomain = domain || DEFAULT_DOMAIN;

    const cachedData: CachedAnalyticsData = {
      linkId,
      slug,
      workspaceId,
      url,
      domain,
      timestamp,
      ...analytics,
      utm_source: utmParams.utm_source ?? undefined,
      utm_medium: utmParams.utm_medium ?? undefined,
      utm_campaign: utmParams.utm_campaign ?? undefined,
      utm_term: utmParams.utm_term ?? undefined,
      utm_content: utmParams.utm_content ?? undefined,
    };

    waitUntil(
      Promise.allSettled([
        // Send to Tinybird
        sendLinkClickEvent({
          timestamp,
          link_id: linkId,
          workspace_id: workspaceId,
          slug,
          url,
          domain: finalDomain,
          ip: analytics.ipAddress,
          country: analytics.country,
          city: analytics.city,
          continent: analytics.continent,
          device: analytics.device,
          browser: analytics.browser,
          os: analytics.os,
          ua: req.headers.get("user-agent") ?? "",
          referer: analytics.referer,
          trigger: analytics.trigger,
          utm_source: utmParams.utm_source ?? "",
          utm_medium: utmParams.utm_medium ?? "",
          utm_campaign: utmParams.utm_campaign ?? "",
          utm_term: utmParams.utm_term ?? "",
          utm_content: utmParams.utm_content ?? "",
        }).catch((err) => console.error("[Tinybird Click Event Error]", err)),

        // Send to internal analytics API
        fetch(`${req.nextUrl.origin}/api/analytics/usages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkId,
            slug,
            domain: finalDomain,
            workspaceId,
            analyticsData: analytics,
            trigger,
            timestamp,
          }),
        }).catch((err) => console.error("[Internal Analytics Error]", err)),

        // Cache analytics event
        cacheAnalyticsEvent(cachedData),
      ]),
    );
  } catch (err) {
    console.error("[Analytics Error]", err);
  }
}

export async function URLRedirects(
  req: NextRequest,
  shortCode: string,
  domain?: string,
): Promise<NextResponse | null> {
  try {
    // Validate input
    if (!shortCode?.trim()) {
      console.warn("Empty shortCode provided to URLRedirects");
      return null;
    }

    // Get link data
    const origin = req.nextUrl.origin;
    const cookieHeader = req.headers.get("cookie") ?? "";
    const linkData = await getLink(shortCode, cookieHeader, origin, domain);

    if (!linkData.success) {
      console.warn(
        `Link lookup failed for slug "${shortCode}":`,
        linkData.error,
      );
      return null;
    }

    // Handle password protection
    if (linkData.requiresPassword) {
      return null;
    }

    // Handle expired links
    if (linkData.expired && linkData.url) {
      return createSafeRedirect(linkData.url, `${origin}/?status=expired`);
    }

    // Handle valid links
    if (linkData.url && linkData.linkId && linkData.workspaceId) {
      const trigger = detectTrigger(req);
      const isBot = trigger === "bot";

      // Serve preview for bots with metadata
      if (isBot && (linkData.title || linkData.image || linkData.metadesc)) {
        return serveLinkPreview(req, shortCode, linkData);
      }

      // Track analytics for non-bot users
      if (!isBot) {
        const ipAddress = getIpAddress(req);
        const isRateLimited = await checkAnalyticsRateLimit(
          ipAddress,
          shortCode,
        );

        if (!isRateLimited) {
          void trackAnalytics(
            req,
            linkData.linkId,
            shortCode,
            linkData.url,
            linkData.workspaceId,
            domain,
            trigger,
          );
        }
      }

      return createSafeRedirect(linkData.url, `${origin}/?status=error`);
    }

    // Handle not found
    if (linkData.url?.includes("status=not-found")) {
      return createSafeRedirect(linkData.url, `${origin}/?status=not-found`);
    }

    return null;
  } catch (error) {
    console.error(`Link redirect error for slug "${shortCode}":`, error);
    return null;
  }
}
