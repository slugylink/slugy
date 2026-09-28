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
import { getClientIp } from "@/lib/middleware/client-ip";
import { checkRedirectMissRateLimit } from "@/lib/middleware/rate-limit";
import { recordLinkClick } from "@/lib/analytics/record-click";
import { recordBioClick } from "@/lib/analytics/record-bio-click";
import { resolveTargetUrl } from "@/lib/link-targeting";
import { createClickId } from "@/lib/leads/generate-click-id";
import {
  cacheClickAttribution,
  type CachedClickAttribution,
} from "@/lib/leads/click-cache";
import { resolveReferer } from "@/lib/analytics/referrer";
import { getGeoData } from "@/lib/analytics/geo";
import {
  SLUGY_ID_COOKIE,
  SLUGY_ID_COOKIE_MAX_AGE,
  SLUGY_ID_PARAM,
} from "@/lib/leads/constants";

const REDIRECT_STATUS = 302;
const UNKNOWN_VALUE = "unknown";
// Short accidental-double-fire guard (browser retry / double-tap), NOT a
// throttle: the old 8s per-IP window dropped legit multi-tab and office-NAT
// clicks. Prefetch/bots are filtered before this ever runs.
const RATE_LIMIT_WINDOW_SECONDS = 2;
const RATE_LIMIT_KEY_PREFIX = "rate_limit:analytics";
const DEFAULT_DOMAIN = "slugy.co";

interface AnalyticsData {
  ipAddress: string;
  country: string;
  city: string;
  region: string;
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

// Extract UTM parameters from a single URL
function extractUTMParamsFromUrl(urlString: string): UTMParams {
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

/** Prefer short-link query UTMs; fall back to destination URL UTMs. */
function extractUTMParams(
  requestUrl: string,
  destinationUrl: string,
): UTMParams {
  const fromRequest = extractUTMParamsFromUrl(requestUrl);
  const fromDestination = extractUTMParamsFromUrl(destinationUrl);
  return {
    utm_source: fromRequest.utm_source ?? fromDestination.utm_source,
    utm_medium: fromRequest.utm_medium ?? fromDestination.utm_medium,
    utm_campaign: fromRequest.utm_campaign ?? fromDestination.utm_campaign,
    utm_term: fromRequest.utm_term ?? fromDestination.utm_term,
    utm_content: fromRequest.utm_content ?? fromDestination.utm_content,
  };
}

function extractRefParam(urlString: string): string | null {
  try {
    return new URL(urlString).searchParams.get("ref");
  } catch {
    return null;
  }
}

// Create safe redirect with fallback — only http(s) destinations
function appendSlugyIdParam(url: string, clickId: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(SLUGY_ID_PARAM, clickId);
    return parsed.toString();
  } catch {
    // Legacy rows with unparseable destinations still redirect — attribution
    // is skipped instead of killing the redirect entirely.
    console.warn(`Skipping slugy_id param for unparseable URL: ${url}`);
    return url;
  }
}

function attachSlugyIdCookie(response: NextResponse, clickId: string): void {
  response.cookies.set(SLUGY_ID_COOKIE, clickId, {
    maxAge: SLUGY_ID_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Share attribution between slugy.co and app.slugy.co in production.
    // Localhost subdomains can't share cookies, so stay host-only there.
    ...(process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ROOT_DOMAIN &&
    !process.env.NEXT_PUBLIC_ROOT_DOMAIN.includes("localhost")
      ? { domain: `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN.trim()}` }
      : {}),
  });
}

function createSafeRedirect(url: string, fallbackUrl: string): NextResponse {
  // Redirects are per-viewer (bot HTML vs human 302, password gates, geo
  // targets) — never cache shared, and vary on the agent that chose them.
  const noStore = (response: NextResponse): NextResponse => {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Vary", "User-Agent");
    return response;
  };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      console.error(`Blocked non-http(s) redirect URL: ${url}`);
      return noStore(
        NextResponse.redirect(new URL(fallbackUrl), REDIRECT_STATUS),
      );
    }
    return noStore(NextResponse.redirect(parsed, REDIRECT_STATUS));
  } catch (error) {
    console.error(`Invalid redirect URL: ${url}`, error);
    return noStore(
      NextResponse.redirect(new URL(fallbackUrl), REDIRECT_STATUS),
    );
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
      // Bot-only HTML must never be served to humans from a shared cache:
      // no-store + Vary kills the poisoning vector (bots simply refetch).
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "User-Agent",
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

// Extract IP address — one shared helper so rate limiting and analytics
// agree behind CF → Vercel (see client-ip.ts).
function getIpAddress(req: NextRequest): string {
  return getClientIp(req.headers, UNKNOWN_VALUE);
}

// Build analytics data from request + destination (for baked-in ref/UTMs)
function buildAnalyticsData(
  req: NextRequest,
  trigger: string,
  destinationUrl: string,
): AnalyticsData {
  const ua = userAgent(req);
  const uaString = req.headers.get("user-agent") ?? "";
  const geoData = getGeoData(req);
  // Priority: explicit ?ref= (?via=/?source= aliases, short link or
  // destination) → Referer header → utm_source → Direct. The utm_source
  // fallback matters because in-app browsers (X, LinkedIn, Instagram,
  // WhatsApp…) often send no Referer header at all.
  const params = req.nextUrl.searchParams;
  const refParam =
    params.get("ref")?.trim() ||
    params.get("via")?.trim() ||
    params.get("source")?.trim() ||
    extractRefParam(destinationUrl)?.trim() ||
    null;
  const headerReferer =
    req.headers.get("referer") ?? req.headers.get("referrer");
  const utmParams = extractUTMParams(req.nextUrl.toString(), destinationUrl);
  let destinationHost: string | null = null;
  try {
    destinationHost = new URL(destinationUrl).hostname;
  } catch {
    destinationHost = null;
  }
  const referer = resolveReferer({
    refParam,
    headerReferer,
    utmSource: utmParams.utm_source,
    excludeHosts: [req.nextUrl.hostname, destinationHost],
  });

  return {
    ipAddress: getIpAddress(req),
    country: geoData.country,
    city: geoData.city,
    region: geoData.region,
    continent: geoData.continent,
    // Layered detection: parsed UA first, token sniffing second, sensible
    // platform defaults last — user-facing breakdowns never show "unknown"
    // for device/browser/os. Geo keeps "unknown" (a location can't be
    // defaulted; in production the CF/Vercel headers are always present —
    // unknowns there mean dev/local traffic).
    device: detectDevice(uaString, ua.device?.type),
    browser: detectBrowser(uaString, ua.browser?.name),
    os: detectOs(uaString, ua.os?.name),
    referer,
    trigger,
  };
}

/**
 * Device class in the parser's vocabulary (mobile/tablet/desktop).
 * Bots are filtered before tracking, so an unparsed UA here is a human on an
 * obscure browser — phone/tablet tokens still classify correctly.
 */
function detectDevice(uaString: string, parsed?: string | null): string {
  if (parsed) return parsed.toLowerCase();
  const s = uaString.toLowerCase();
  if (
    /tablet|ipad|playbook|kindle|silk(?!.*mobile)|nexus [79]|sm-t\d/i.test(s)
  ) {
    return "tablet";
  }
  if (
    /mobi|mobile|android|iphone|ipod|phone|blackberry|iemobile|opera mini|windows phone|palm|symbian/i.test(
      s,
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

/** Browser name in the parser's vocabulary, else the client's own token. */
function detectBrowser(uaString: string, parsed?: string | null): string {
  if (parsed) return parsed.toLowerCase();
  const s = uaString.toLowerCase();
  if (/edg(a|ios|e)?\//.test(s)) return "edge";
  if (/opr\//.test(s)) return "opera";
  if (/firefox|fxios/.test(s)) return "firefox";
  if (/crios/.test(s)) return "chrome";
  if (/samsungbrowser/.test(s)) return "samsung internet";
  if (/chrome|chromium/.test(s)) return "chrome";
  if (/safari/.test(s)) {
    return /mobi|mobile|iphone|ipad/.test(s) ? "mobile safari" : "safari";
  }
  if (/msie|trident/.test(s)) return "ie";
  // Honest token (e.g. a script that slipped past bot filters) beats a lie.
  const token = /^\s*([a-z][\w-]*)\//i.exec(uaString)?.[1];
  if (token && token.toLowerCase() !== "mozilla") return token.toLowerCase();
  return "chrome";
}

/** OS name in the parser's vocabulary ("mac os" matches "Mac OS" parsed). */
function detectOs(uaString: string, parsed?: string | null): string {
  if (parsed) return parsed.toLowerCase();
  const s = uaString.toLowerCase();
  if (/windows nt|windows phone/.test(s)) return "windows";
  if (/android/.test(s)) return "android";
  if (/iphone|ipad|ipod/.test(s)) return "ios";
  if (/mac os x|macintosh/.test(s)) return "mac os";
  if (/cros/.test(s)) return "chrome os";
  if (/linux/.test(s)) return "linux";
  return "windows";
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
  clickId: string,
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const analytics = buildAnalyticsData(req, trigger, url);
    const utmParams = extractUTMParams(req.nextUrl.toString(), url);
    const finalDomain = domain || DEFAULT_DOMAIN;

    // NOTE: slugy_click_events has no `region` column, so region is
    // intentionally NOT in the Tinybird payload — unknown columns 400 the
    // ingest. Region flows to Prisma via the Redis batch (column exists) and
    // can join Tinybird after a datasource migration adds the column.
    const cachedData: CachedAnalyticsData = {
      linkId,
      slug,
      workspaceId,
      url,
      domain,
      clickId,
      timestamp,
      ...analytics,
      utm_source: utmParams.utm_source ?? undefined,
      utm_medium: utmParams.utm_medium ?? undefined,
      utm_campaign: utmParams.utm_campaign ?? undefined,
      utm_term: utmParams.utm_term ?? undefined,
      utm_content: utmParams.utm_content ?? undefined,
    };

    const clickAttribution: CachedClickAttribution = {
      clickId,
      linkId,
      workspaceId,
      slug,
      url,
      domain: finalDomain,
      country: analytics.country,
      city: analytics.city,
      region: analytics.region,
      continent: analytics.continent,
      device: analytics.device,
      browser: analytics.browser,
      os: analytics.os,
      referer: analytics.referer,
      utm_source: utmParams.utm_source ?? "",
      utm_medium: utmParams.utm_medium ?? "",
      utm_campaign: utmParams.utm_campaign ?? "",
      utm_term: utmParams.utm_term ?? "",
      utm_content: utmParams.utm_content ?? "",
      timestamp,
    };

    // Caller must wrap this in waitUntil — do not nest waitUntil after awaits.
    await Promise.allSettled([
      // Tinybird click events (dashboard source)
      sendLinkClickEvent({
        timestamp,
        link_id: linkId,
        workspace_id: workspaceId,
        click_id: clickId,
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

      cacheClickAttribution(clickAttribution).catch((err) =>
        console.error("[Click Cache Error]", err),
      ),

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
  const lockKey = `tb:meta:lock:${input.linkId}`;

  try {
    const exists = await redis.get(key);
    if (exists) return;

    // First-click race: N concurrent clicks must not each append a metadata
    // row. The loser skips — the winner's write covers everyone. Lock expiry
    // bounds the damage if the winner dies mid-write (next click retries).
    const acquired = await redis.set(lockKey, "1", { nx: true, ex: 120 });
    if (!acquired) return;

    let sent = false;
    try {
      await sendLinkMetadata({
        link_id: input.linkId,
        domain: input.domain,
        slug: input.slug,
        url: input.url,
        tag_ids: [],
        workspace_id: input.workspaceId,
        created_at: input.createdAt,
      });
      sent = true;
    } catch (sendError) {
      // No immediate retry here — the outer catch would re-send blindly.
      // The lock is released below so the next click retries.
      console.error("[Tinybird Metadata Error]", sendError);
      return;
    } finally {
      if (sent) {
        await redis
          .set(key, "1", { ex: 60 * 60 * 24 * 30 })
          .catch(() => undefined);
      }
      await redis.del(lockKey).catch(() => undefined);
    }
    return;
  } catch {
    // Redis down — attempt the write anyway. Duplicate metadata rows are
    // harmless: the _latest ReplacingMergeTree view collapses them.
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
      // Scan-flood guard: misses are cheap (30s negative cache) but unbounded
      // enumeration isn't — throttle miss-heavy viewers with a 429.
      if (linkData.error === "Link not found") {
        const missLimit = await checkRedirectMissRateLimit(getIpAddress(req));
        if (!missLimit.success) {
          return NextResponse.json(
            { error: "Rate limit exceeded" },
            {
              status: 429,
              headers: {
                "Retry-After": Math.max(
                  1,
                  Math.ceil((missLimit.reset - Date.now()) / 1000),
                ).toString(),
              },
            },
          );
        }
      }
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
      const geoData = getGeoData(req);
      const destinationUrl = resolveTargetUrl({
        defaultUrl: linkData.url,
        geo: linkData.geo,
        country: geoData.country,
      });
      const trigger = detectTrigger(req, destinationUrl);
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

      const clickId = createClickId();
      // Dub-style: only append ?slugy_id= when conversion tracking is enabled.
      const redirectUrl = linkData.trackConversion
        ? appendSlugyIdParam(destinationUrl, clickId)
        : destinationUrl;

      // Track analytics for humans only (skip bots + browser prefetch).
      // waitUntil MUST be registered before the 302 returns — a bare void/async
      // after Redis will be frozen on Vercel and Tinybird events never land.
      if (!isBot && trigger !== "prefetch") {
        const bioLinkId = req.nextUrl.searchParams.get("bio")?.trim() || null;
        waitUntil(
          (async () => {
            const ipAddress = getIpAddress(req);
            const isRateLimited = await checkAnalyticsRateLimit(
              ipAddress,
              shortCode,
            );
            if (isRateLimited) return;

            await Promise.allSettled([
              trackAnalytics(
                req,
                linkData.linkId!,
                shortCode,
                destinationUrl,
                linkData.workspaceId!,
                domain,
                trigger,
                clickId,
              ),
              // Bio attribution: ?bio=<bioLinkId> on short-link clicks from
              // bio pages. Validated inside (must match this linkId).
              bioLinkId
                ? recordBioClick({ bioLinkId, linkId: linkData.linkId! })
                : Promise.resolve({ ok: false }),
            ]);
          })(),
        );
      }

      const redirectResponse = createSafeRedirect(
        redirectUrl,
        `${origin}/?status=error`,
      );
      if (linkData.trackConversion) {
        attachSlugyIdCookie(redirectResponse, clickId);
      }
      return redirectResponse;
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
