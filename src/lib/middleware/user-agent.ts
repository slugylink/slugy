import { geolocation, ipAddress } from "@vercel/functions";
import { type NextRequest, userAgent } from "next/server";
import { METADATA_BOT_PATTERNS } from "./bot-patterns";
import Bowser from "bowser";

// Pre-compile regex for better performance
const METADATA_BOT_REGEX = new RegExp(METADATA_BOT_PATTERNS.join("|"), "i");

/**
 * Checks if the request is coming from a metadata preview bot
 * Uses a fast-path approach with cached regex
 */
function isMetadataPreviewBot(req: NextRequest): boolean {
  const uaString = req.headers.get("user-agent")?.toLowerCase() ?? "";

  // Quick check with regex before using the more expensive userAgent() function
  if (METADATA_BOT_REGEX.test(uaString)) {
    return true;
  }

  // Fall back to the full userAgent check only if needed
  const ua = userAgent(req);
  return ua.isBot ?? false;
}

interface GeoData {
  country?: string;
  city?: string;
  region?: string;
  continent?: string;
}

interface UserAgentData {
  ipAddress: string;
  country?: string;
  city?: string;
  region?: string;
  continent?: string;
  referer?: string;
  browser?: string;
  os?: string;
  device?: string;
  isBot: boolean;
}

// Simple URL param setter - inlined for performance
const setUrlParam = (
  url: URL,
  key: string,
  value: string | undefined | null,
  fallback = "Unknown",
): void => {
  url.searchParams.set(key, value ?? fallback);
};

/**
 * Optimized user agent parsing
 */
function parseUserAgent(uaHeader: string | null): {
  device: string;
  browser: string;
  os: string;
} {
  if (!uaHeader) {
    return { device: "desktop", browser: "chrome", os: "Unknown" };
  }

  try {
    const ua = userAgent({ headers: new Headers({ "user-agent": uaHeader }) });
    let bowserData = null;

    // Only parse with Bowser if we need fallback values
    if (!ua.device.type || !ua.browser.name || !ua.os.name) {
      bowserData = Bowser.parse(uaHeader);
    }

    return {
      device: ua.device.type ?? bowserData?.platform?.type ?? "desktop",
      browser: ua.browser.name ?? bowserData?.browser?.name ?? "chrome",
      os: ua.os.name ?? bowserData?.os?.name ?? "Unknown",
    };
  } catch (error) {
    console.warn(
      "Failed to parse user agent:",
      error instanceof Error ? error.message : String(error),
    );

    return { device: "desktop", browser: "chrome", os: "Unknown" };
  }
}

/**
 * Extracts user agent and geolocation data from the request
 * Returns an object with all the analytics data
 * Optimized for Edge Runtime performance
 */
export function extractUserAgentData(req: NextRequest): UserAgentData {
  const isBot = isMetadataPreviewBot(req);

  const uaHeader = req.headers.get("user-agent");
  const refererHeader = req.headers.get("referer");

  const vercelCountry = req.headers.get("x-vercel-ip-country");
  const vercelCity = req.headers.get("x-vercel-ip-city");
  const vercelRegion = req.headers.get("x-vercel-ip-country-region");
  const vercelContinent = req.headers.get("x-vercel-ip-continent");

  const ip = ipAddress(req) ?? "Unknown";
  const geo: GeoData = geolocation(req) ?? {};

  // Initialize result object with optimized fallbacks
  const result: UserAgentData = {
    ipAddress: ip,
    country: geo.country ?? vercelCountry ?? undefined,
    city: geo.city ?? vercelCity ?? geo.region ?? undefined,
    region: geo.region ?? vercelRegion ?? undefined,
    continent: geo.continent ?? vercelContinent ?? undefined,
    referer: refererHeader ?? undefined,
    isBot,
  };

  // Early return for bots to avoid unnecessary processing
  if (isBot) {
    return result;
  }

  // Parse user agent
  const { device, browser, os } = parseUserAgent(uaHeader);

  result.device = device;
  result.browser = browser;
  result.os = os;

  return result;
}

/**
 * Optimized function to append geolocation and user agent data to the URL
 * Uses conditional execution and header caching for better performance
 */
export function appendGeoAndUserAgent(url: URL, req: NextRequest): void {
  const data = extractUserAgentData(req);

  // Set URL parameters
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
  setUrlParam(url, "device", data.device);
  setUrlParam(url, "browser", data.browser);
  setUrlParam(url, "os", data.os);
}
