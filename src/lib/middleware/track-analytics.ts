import { waitUntil } from "@vercel/functions";
import { NextRequest, userAgent } from "next/server";
import { sendLinkClickEvent } from "@/lib/tinybird/slugy_click_events";
import {
  cacheAnalyticsEvent,
  type CachedAnalyticsData,
} from "@/lib/cache-utils/analytics-cache";
import { redis } from "@/lib/redis";
import { db } from "@/server/db";

const UNKNOWN_VALUE = "unknown";
const DIRECT_REFERER = "Direct";
const RATE_LIMIT_WINDOW_SECONDS = 10;
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

export interface TrackLinkAnalyticsParams {
  linkId: string;
  slug: string;
  url: string;
  workspaceId: string;
  domain?: string;
  trigger: string;
}

function safeDecodeURIComponent(value: string | null): string {
  if (!value) return UNKNOWN_VALUE;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getGeoData(req: NextRequest) {
  const headers = req.headers;

  const cfCountry = headers.get("cf-ipcountry");
  const cfCity = headers.get("cf-ipcity");
  const cfContinent = headers.get("cf-ipcontinent");
  const cfRegion = headers.get("cf-region");

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
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };
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
    const [workspace, usage] = await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: { maxClicksLimit: true }, // TODO: use cache
      }),
      db.usage.findFirst({
        where: { workspaceId },
        select: { clicksTracked: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!workspace?.maxClicksLimit || !usage) return false;

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

      cacheAnalyticsEvent(cachedData),
    ]),
  );
}

export async function trackLinkAnalytics(
  req: NextRequest,
  params: TrackLinkAnalyticsParams,
): Promise<void> {
  try {
    const limitReached = await isWorkspaceClickLimitReached(params.workspaceId);
    if (limitReached) return;

    const ipAddress = getIpAddress(req);
    const isRateLimited = await checkAnalyticsRateLimit(
      ipAddress,
      params.slug,
    );
    if (isRateLimited) return;

    await dispatchAnalytics(req, params);
  } catch (error) {
    console.error("[Analytics Error]", error);
  }
}

