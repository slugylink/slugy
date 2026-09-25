import { waitUntil } from "@vercel/functions";
import {
  ANALYTICS_INGEST_HEADER,
  analyticsIngestPayload,
  signInternalAnalyticsIngest,
} from "@/lib/analytics/internal-ingest-auth";
import { NextRequest, userAgent } from "next/server";
import { sendLinkClickEvent } from "@/lib/tinybird/slugy_click_events";
import {
  cacheAnalyticsEvent,
  type CachedAnalyticsData,
} from "@/lib/cache-utils/analytics-cache";
import { redis } from "@/lib/redis";
import { db } from "@/server/db";
import { resolveReferer } from "@/lib/analytics/referrer";
import { getGeoData } from "@/lib/analytics/geo";
import {
  getWorkspaceLimitsCache,
  setWorkspaceLimitsCache,
} from "@/lib/cache-utils/workspace-cache";

const UNKNOWN_VALUE = "unknown";
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

export interface TrackLinkAnalyticsParams {
  linkId: string;
  slug: string;
  url: string;
  workspaceId: string;
  domain?: string;
  trigger: string;
}

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

async function checkAnalyticsRateLimit(
  ipAddress: string,
  slug: string,
): Promise<boolean> {
  if (!ipAddress || ipAddress === UNKNOWN_VALUE) {
    return false;
  }

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

function getIpAddress(req: NextRequest): string {
  const xri = req.headers.get("x-real-ip");
  const xff = req.headers.get("x-forwarded-for");
  return xri || xff?.split(",")[0]?.trim() || UNKNOWN_VALUE;
}

async function isWorkspaceClickLimitReached(
  workspaceId: string,
): Promise<boolean> {
  try {
    // Try cache first for fast path
    const cached = await getWorkspaceLimitsCache(workspaceId);
    if (cached) {
      return cached.clicksTracked >= cached.maxClicksLimit;
    }

    // Cache miss: fetch from DB and cache for next time
    const [workspace, usage] = await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: { maxClicksLimit: true },
      }),
      db.usage.findFirst({
        where: { workspaceId },
        select: { clicksTracked: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!workspace?.maxClicksLimit || !usage) return false;

    // Cache the result for future requests
    void setWorkspaceLimitsCache(workspaceId, {
      maxClicksLimit: workspace.maxClicksLimit,
      clicksTracked: usage.clicksTracked,
    });

    return usage.clicksTracked >= workspace.maxClicksLimit;
  } catch (error) {
    console.error("[Click Limit Check Error]", error);
    return false;
  }
}

async function dispatchAnalytics(
  req: NextRequest,
  params: TrackLinkAnalyticsParams,
): Promise<void> {
  const { linkId, slug, url, workspaceId, domain, trigger } = params;

  const ua = userAgent(req);
  const timestamp = new Date().toISOString();
  const geoData = getGeoData(req);
  const ipAddress = getIpAddress(req);
  const utmParams = extractUTMParams(req.nextUrl.toString(), url);
  const searchParams = req.nextUrl.searchParams;
  const refParam =
    searchParams.get("ref")?.trim() ||
    searchParams.get("via")?.trim() ||
    searchParams.get("source")?.trim() ||
    extractRefParam(url)?.trim() ||
    null;
  const headerReferer =
    req.headers.get("referer") ?? req.headers.get("referrer");
  let destinationHost: string | null = null;
  try {
    destinationHost = new URL(url).hostname;
  } catch {
    destinationHost = null;
  }

  const analytics: AnalyticsData = {
    ipAddress,
    country: geoData.country,
    city: geoData.city,
    continent: geoData.continent,
    device: ua.device?.type?.toLowerCase() ?? DEFAULT_DEVICE,
    browser: ua.browser?.name?.toLowerCase() ?? DEFAULT_BROWSER,
    os: ua.os?.name?.toLowerCase() ?? DEFAULT_OS,
    referer: resolveReferer({
      refParam,
      headerReferer,
      utmSource: utmParams.utm_source,
      excludeHosts: [req.nextUrl.hostname, destinationHost],
    }),
    trigger,
  };

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

      fetch(`${req.nextUrl.origin}/api/analytics/usages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [ANALYTICS_INGEST_HEADER]: signInternalAnalyticsIngest(
            analyticsIngestPayload({ linkId, workspaceId, slug }),
          ),
        },
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

      cacheAnalyticsEvent(cachedData).catch((err) =>
        console.error("[Analytics Cache Error]", err),
      ),
    ]),
  );
}

export async function trackLinkAnalytics(
  req: NextRequest,
  params: TrackLinkAnalyticsParams,
): Promise<void> {
  try {
    const limitReached = await isWorkspaceClickLimitReached(params.workspaceId);
    if (limitReached) {
      console.warn(
        `[Analytics] Click limit reached for workspace ${params.workspaceId}`,
      );
      return;
    }

    const ipAddress = getIpAddress(req);
    const isRateLimited = await checkAnalyticsRateLimit(ipAddress, params.slug);
    if (isRateLimited) return;

    await dispatchAnalytics(req, params);
  } catch (error) {
    console.error("[Analytics Error]", error);
  }
}
