import { type NextRequest, userAgent } from "next/server";
import { METADATA_BOT_PATTERNS } from "./bot-patterns";

// Pre-compile regex for better performance
const METADATA_BOT_REGEX = new RegExp(METADATA_BOT_PATTERNS.join("|"), "i");

/**
 * Checks if the request is coming from a metadata preview bot
 */
function isMetadataPreviewBot(req: NextRequest): boolean {
  const uaString = req.headers.get("user-agent")?.toLowerCase() ?? "";
  
  // Quick check with regex before using the more expensive userAgent() function
  if (METADATA_BOT_REGEX.test(uaString)) {
    return true;
  }

  const ua = userAgent(req);
  return ua.isBot ?? false;
}

/**
 * Sets a URL parameter with fallback value
 */
function setUrlParam(
  url: URL,
  key: string,
  value: string | undefined | null,
  fallback = "Unknown",
): void {
  url.searchParams.set(key, value ?? fallback);
}

/**
 * Extracts user agent and geo data from the request
 */
export function extractUserAgentData(req: NextRequest) {
  const isBot = isMetadataPreviewBot(req);
  const refererHeader = req.headers.get("referer");
  const vercelCountry = req.headers.get("x-vercel-ip-country");
  const vercelCity = req.headers.get("x-vercel-ip-city");
  const vercelRegion = req.headers.get("x-vercel-ip-country-region");
  const vercelContinent = req.headers.get("x-vercel-ip-continent");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "Unknown";
  const ua = userAgent(req);
  
  return {
    ipAddress: ip,
    country: vercelCountry ?? undefined,
    city: vercelCity ?? undefined,
    region: vercelRegion ?? undefined,
    continent: vercelContinent ?? undefined,
    referer: refererHeader ?? undefined,
    device: ua.device,
    browser: ua.browser,
    os: ua.os,
    isBot,
  };
}

/**
 * Appends geolocation and user agent data to the URL
 */
export function appendGeoAndUserAgent(url: URL, req: NextRequest): void {
  const data = extractUserAgentData(req);

  setUrlParam(url, "isMetadataPreview", data.isBot.toString());

  // Early return for bots to avoid unnecessary processing
  if (data.isBot) {
    return;
  }

  setUrlParam(url, "ipAddress", data.ipAddress);
  setUrlParam(url, "country", data.country);
  setUrlParam(url, "city", data.city);
  setUrlParam(url, "region", data.region);
  setUrlParam(url, "continent", data.continent);
  setUrlParam(url, "referer", data.referer, "direct");
  setUrlParam(url, "device", data.device?.type ?? "desktop");
  setUrlParam(url, "browser", data.browser?.name ?? "chrome");
  setUrlParam(url, "os", data.os?.name ?? "windows");
}
