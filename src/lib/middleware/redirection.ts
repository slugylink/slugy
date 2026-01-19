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
const RATE_LIMIT_WINDOW_SECONDS = 10;
const RATE_LIMIT_KEY_PREFIX = "rate_limit:analytics";
const DEFAULT_DOMAIN = "slugy.co";
const DEFAULT_DEVICE = "desktop";
const DEFAULT_BROWSER = "chrome";
const DEFAULT_OS = "windows";

/**
 * Safely decodes a URI component with error handling
 */
function safeDecodeURIComponent(value: string | null): string {
  if (!value) return UNKNOWN_VALUE;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Extracts geolocation data from request headers, supporting both Vercel and Cloudflare
 */
function getGeoData(req: NextRequest) {
  const headers = req.headers;

  // Try Cloudflare headers first (since you're using Cloudflare now)
  const cfCountry = headers.get("cf-ipcountry");
  const cfCity = headers.get("cf-ipcity");
  const cfContinent = headers.get("cf-ipcontinent");
  const cfRegion = headers.get("cf-region");

  // Fallback to Vercel headers if Cloudflare headers are not available
  const vercelCountry = headers.get("x-vercel-ip-country");
  const vercelCity = headers.get("x-vercel-ip-city");
  const vercelContinent = headers.get("x-vercel-ip-continent");
  const vercelRegion = headers.get("x-vercel-ip-country-region");

  return {
    country: (cfCountry || vercelCountry)?.toLowerCase() ?? UNKNOWN_VALUE,
    city: safeDecodeURIComponent(cfCity || vercelCity),
    continent: (cfContinent || vercelContinent)?.toLowerCase() ?? UNKNOWN_VALUE,
    region: cfRegion || vercelRegion || UNKNOWN_VALUE,
  };
}

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
 * Extracts UTM parameters from a URL string
 */
function extractUTMParams(urlString: string) {
  try {
    const urlObj = new URL(urlString);
    const params = urlObj.searchParams;
    return {
      utm_source: params.get("utm_source") || null,
      utm_medium: params.get("utm_medium") || null,
      utm_campaign: params.get("utm_campaign") || null,
      utm_term: params.get("utm_term") || null,
      utm_content: params.get("utm_content") || null,
    };
  } catch {
    // Invalid URL, return null values
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };
  }
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

/**
 * Checks if the IP address has made a recent analytics request for a given slug within the rate limit window
 * @param ipAddress - The IP address to check
 * @param slug - The slug to scope the rate limiting to
 * @returns true if rate limited (should skip analytics), false if analytics should proceed
 */
async function checkAnalyticsRateLimit(
  ipAddress: string,
  slug: string,
): Promise<boolean> {
  if (!ipAddress || ipAddress === UNKNOWN_VALUE) {
    return false; // Don't rate limit if we don't have a valid IP
  }

  try {
    const key = `${RATE_LIMIT_KEY_PREFIX}:${ipAddress}:${slug}`;
    // Atomic set-if-not-exists with TTL. If it returns null, key exists => rate limited
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
    // If Redis fails, allow analytics to proceed (fail open)
    console.error("[Rate Limit Error]", error);
    return false;
  }
}

/**
 * Extracts IP address from request headers
 */
function getIpAddress(req: NextRequest): string {
  const xri = req.headers.get("x-real-ip");
  const xff = req.headers.get("x-forwarded-for");
  return xri || xff?.split(",")[0]?.trim() || UNKNOWN_VALUE;
}

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
    const ua = userAgent(req);
    const headers = req.headers;
    const timestamp = new Date().toISOString();
    const geoData = getGeoData(req);

    const analytics: AnalyticsData = {
      ipAddress: headers.get("x-forwarded-for") ?? UNKNOWN_VALUE,
      country: geoData.country,
      city: geoData.city,
      continent: geoData.continent,
      device: ua.device?.type?.toLowerCase() ?? DEFAULT_DEVICE,
      browser: ua.browser?.name?.toLowerCase() ?? DEFAULT_BROWSER,
      os: ua.os?.name?.toLowerCase() ?? DEFAULT_OS,
      referer: headers.get("referer") ?? DIRECT_REFERER,
      trigger,
    };

    const utmParams = extractUTMParams(url);

    // Prepare analytics data for Redis caching
    const cachedData: CachedAnalyticsData = {
      linkId,
      slug,
      workspaceId,
      url,
      domain,
      timestamp,
      ipAddress: analytics.ipAddress,
      country: analytics.country,
      city: analytics.city,
      continent: analytics.continent,
      device: analytics.device,
      browser: analytics.browser,
      os: analytics.os,
      referer: analytics.referer,
      trigger: analytics.trigger,
      utm_source: utmParams.utm_source || undefined,
      utm_medium: utmParams.utm_medium || undefined,
      utm_campaign: utmParams.utm_campaign || undefined,
      utm_term: utmParams.utm_term || undefined,
      utm_content: utmParams.utm_content || undefined,
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
          domain: domain || DEFAULT_DOMAIN,
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

        // Send to internal usage analytics
        fetch(`${req.nextUrl.origin}/api/analytics/usages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkId,
            slug,
            domain: domain || DEFAULT_DOMAIN,
            workspaceId,
            analyticsData: analytics,
            trigger,
            timestamp,
          }),
        }).catch((err) => console.error("[Internal Analytics Error]", err)),

        //batch processing
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
        const ipAddress = getIpAddress(req);
        const isRateLimited = await checkAnalyticsRateLimit(ipAddress, shortCode);

        if (!isRateLimited) {
          // Fire and forget analytics - don't await
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
