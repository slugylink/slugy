import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse, userAgent } from "next/server";
import { getLink } from "./get-link";
import { detectTrigger } from "./detect-trigger";
import { sendLinkClickEvent } from "@/lib/tinybird/slugy_click_events";
import { sendLinkMetadata } from "@/lib/tinybird/slugy-links-metadata";
import {
  cacheAnalyticsEvent,
  type CachedAnalyticsData,
} from "@/lib/cache-utils/analytics-cache";
import { redis } from "@/lib/redis";
import { recordLinkClick } from "@/lib/analytics/record-click";

const REDIRECT_STATUS = 302;
const UNKNOWN_VALUE = "unknown";
const DIRECT_REFERER = "Direct";
const RATE_LIMIT_WINDOW_SECONDS = 8;
const RATE_LIMIT_KEY_PREFIX = "rate_limit:analytics";
const DEFAULT_DOMAIN = "slugy.co";
const DEFAULT_DEVICE = "desktop";
const DEFAULT_BROWSER = "chrome";
const DEFAULT_OS = "windows";
const MAX_REFERER_LENGTH = 512;

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

function truncateValue(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

// Normalize referer into a stable analytics source value.
function normalizeReferer(rawValue: string | null): string {
  const trimmed = rawValue?.trim();
  if (!trimmed) return DIRECT_REFERER;

  const decoded = truncateValue(
    safeDecodeURIComponent(trimmed),
    MAX_REFERER_LENGTH,
  );
  if (!decoded) return DIRECT_REFERER;

  if (/^https?:\/\//i.test(decoded)) {
    try {
      return new URL(decoded).origin;
    } catch {
      return decoded;
    }
  }

  // Common case: hostname-like values (e.g. "google.com")
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(decoded)) {
    try {
      return new URL(`https://${decoded}`).origin;
    } catch {
      return decoded;
    }
  }

  return decoded;
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

// Create safe redirect with fallback — only http(s) destinations
function createSafeRedirect(url: string, fallbackUrl: string): NextResponse {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      console.error(`Blocked non-http(s) redirect URL: ${url}`);
      return NextResponse.redirect(new URL(fallbackUrl), REDIRECT_STATUS);
    }
    return NextResponse.redirect(parsed, REDIRECT_STATUS);
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
  const metadesc = linkData.metadesc || linkData.description || "";
  const canonicalUrl = `${baseUrl}/${slug}`;

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
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="Slugy">
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
    return false;
  }
}

// Extract IP address from headers (platform-trusted)
function getIpAddress(req: NextRequest): string {
  const hasCloudflare = Boolean(req.headers.get("cf-ray"));
  const forwarded = req.headers.get("x-forwarded-for");
  const hops = forwarded
    ?.split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  return (
    (hasCloudflare ? req.headers.get("cf-connecting-ip") : null) ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    hops?.[hops.length - 1] ||
    UNKNOWN_VALUE
  );
}

// Build analytics data from request
function buildAnalyticsData(req: NextRequest, trigger: string): AnalyticsData {
  const ua = userAgent(req);
  const geoData = getGeoData(req);
  const refParam = req.nextUrl.searchParams.get("ref");
  const headerReferer = req.headers.get("referer");
  const referer = normalizeReferer(refParam?.trim() ? refParam : headerReferer);

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

    // Caller must wrap this in waitUntil — do not nest waitUntil after awaits.
    await Promise.allSettled([
      // Tinybird click events (dashboard source)
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

      // Ensure link exists in Tinybird metadata (analytics_pipe INNER JOINs on it)
      ensureTinybirdLinkMetadata({
        linkId,
        workspaceId,
        slug,
        url,
        domain: finalDomain,
        createdAt: timestamp,
      }).catch((err) => console.error("[Tinybird Metadata Error]", err)),

      // Edge-safe click counters (Neon)
      recordLinkClick({
        linkId,
        workspaceId,
        slug,
        domain: finalDomain,
      }).catch((err) => console.error("[Click Counter Error]", err)),

      // Redis batch cache (Prisma analytics backfill)
      cacheAnalyticsEvent(cachedData),
    ]);
  } catch (err) {
    console.error("[Analytics Error]", err);
  }
}

/** Once per link (Redis) so analytics_pipe INNER JOIN has metadata. */
async function ensureTinybirdLinkMetadata(input: {
  linkId: string;
  workspaceId: string;
  slug: string;
  url: string;
  domain: string;
  createdAt: string;
}): Promise<void> {
  const key = `tb:meta:${input.linkId}`;
  try {
    const exists = await redis.get(key);
    if (exists) return;
  } catch {
    // Redis down — still attempt Tinybird write
  }

  await sendLinkMetadata({
    link_id: input.linkId,
    domain: input.domain,
    slug: input.slug,
    url: input.url,
    tag_ids: [],
    workspace_id: input.workspaceId,
    created_at: input.createdAt,
  });

  try {
    await redis.set(key, "1", { ex: 60 * 60 * 24 * 30 });
  } catch {
    // ignore
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
      const isExplicitPreviewRequest =
        req.headers.get("x-slugy-preview") === "1" ||
        req.nextUrl.searchParams.get("preview") === "1";
      const hasPreviewMetadata = Boolean(
        linkData.title ||
          linkData.image ||
          linkData.metadesc ||
          linkData.description,
      );

      // Serve preview for bots with metadata
      if ((isBot || isExplicitPreviewRequest) && hasPreviewMetadata) {
        return serveLinkPreview(req, shortCode, linkData);
      }

      // Track analytics for humans only (skip bots + browser prefetch).
      // waitUntil MUST be registered before the 302 returns — a bare void/async
      // after Redis will be frozen on Vercel and Tinybird events never land.
      if (!isBot && trigger !== "prefetch") {
        waitUntil(
          (async () => {
            const ipAddress = getIpAddress(req);
            const isRateLimited = await checkAnalyticsRateLimit(
              ipAddress,
              shortCode,
            );
            if (isRateLimited) return;

            await trackAnalytics(
              req,
              linkData.linkId!,
              shortCode,
              linkData.url!,
              linkData.workspaceId!,
              domain,
              trigger,
            );
          })(),
        );
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
