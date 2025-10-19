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
    city: decodeURIComponent(cfCity || vercelCity || UNKNOWN_VALUE),
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

const REDIRECT_STATUS = 302;
const UNKNOWN_VALUE = "unknown";
const DIRECT_REFERER = "Direct";
const RATE_LIMIT_WINDOW_SECONDS = 10;
const RATE_LIMIT_KEY_PREFIX = "rate_limit:analytics";

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
      console.log(`[Rate Limit] Skipping analytics for IP ${ipAddress} on slug ${slug}`);
    }
    return limited;
  } catch (error) {
    // If Redis fails, allow analytics to proceed (fail open)
    console.error("[Rate Limit Error]", error);
    return false;
  }
}

async function trackAnalytics(
  req: NextRequest,
  linkId: string,
  slug: string,
  url: string,
  workspaceId: string,
  domain?: string,
): Promise<void> {
  try {
    const ua = userAgent(req);
    const headers = req.headers;
    const trigger = detectTrigger(req);
    const timestamp = new Date().toISOString();

    const geoData = getGeoData(req);
    
    const analytics: AnalyticsData = {
      ipAddress: headers.get("x-forwarded-for") ?? UNKNOWN_VALUE,
      country: geoData.country,
      city: geoData.city,
      continent: geoData.continent,
      device: ua.device?.type?.toLowerCase() ?? "desktop",
      browser: ua.browser?.name?.toLowerCase() ?? "chrome",
      os: ua.os?.name?.toLowerCase() ?? "windows",
      referer: headers.get("referer") ?? DIRECT_REFERER,
      trigger,
    };

    function extractUTMParams(url: string) {
      const params = new URL(url).searchParams;
      return {
        utm_source: params.get("utm_source") || null,
        utm_medium: params.get("utm_medium") || null,
        utm_campaign: params.get("utm_campaign") || null,
        utm_term: params.get("utm_term") || null,
        utm_content: params.get("utm_content") || null,
      };
    }

    const utmParams = extractUTMParams(url);

    // Prepare analytics data for Redis caching
    const cachedData: CachedAnalyticsData = {
      linkId,
      slug,
      workspaceId,
      url,
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
          domain: domain || "slugy.co",
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
            domain: domain || "slugy.co",
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
      return NextResponse.redirect(new URL(linkData.url), REDIRECT_STATUS);
    }

    if (linkData.url && linkData.linkId && linkData.workspaceId) {
      // Check rate limiting before tracking analytics
      const xff = req.headers.get("x-forwarded-for") ?? "";
      const xri = req.headers.get("x-real-ip") ?? "";
      const ipAddress = (xri || xff.split(",")[0]?.trim() || UNKNOWN_VALUE);
      const isRateLimited = await checkAnalyticsRateLimit(ipAddress, shortCode);

      if (!isRateLimited) {
        void trackAnalytics(
          req,
          linkData.linkId,
          shortCode,
          linkData.url,
          linkData.workspaceId,
          domain,
        );
      } else {
        console.log(`[Analytics Skipped] Rate limited for IP ${ipAddress} on slug ${shortCode}`);
      }

      return NextResponse.redirect(new URL(linkData.url), REDIRECT_STATUS);
    }

    if (linkData.url?.includes("status=not-found")) {
      return NextResponse.redirect(new URL(linkData.url), REDIRECT_STATUS);
    }

    return null;
  } catch (error) {
    console.error(`Link redirect error for slug "${shortCode}":`, error);
    return null;
  }
}
