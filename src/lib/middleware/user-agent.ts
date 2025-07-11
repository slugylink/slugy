import { type NextRequest, userAgent } from "next/server";
import { METADATA_BOT_PATTERNS } from "./bot-patterns";

// Pre-compile regex for better performance
const METADATA_BOT_REGEX = new RegExp(METADATA_BOT_PATTERNS.join("|"), "i");

/**
 * Checks if the request is coming from a metadata preview bot
 */
function isMetadataPreviewBot(req: NextRequest): boolean {
  const uaString = req.headers.get("user-agent")?.toLowerCase() ?? "";
  return METADATA_BOT_REGEX.test(uaString) || (userAgent(req).isBot ?? false);
}

/**
 * Extracts user agent and geo data from the request.
 */
export function extractUserAgentData(req: NextRequest) {
  const isBot = isMetadataPreviewBot(req);
  const ua = userAgent(req);
  
  return {
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "Unknown",
    country: req.headers.get("x-vercel-ip-country") ?? undefined,
    city: req.headers.get("x-vercel-ip-city") ?? undefined,
    region: req.headers.get("x-vercel-ip-country-region") ?? undefined,
    continent: req.headers.get("x-vercel-ip-continent") ?? undefined,
    referer: req.headers.get("referer") ?? undefined,
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

  // Set URL parameters efficiently
  const params = url.searchParams;
  params.set("isMetadataPreview", data.isBot.toString());

  // Early return for bots
  if (data.isBot) return;

  params.set("ipAddress", data.ipAddress);
  params.set("country", data.country ?? "Unknown");
  params.set("city", data.city ?? "Unknown");
  params.set("region", data.region ?? "Unknown");
  params.set("continent", data.continent ?? "Unknown");
  params.set("referer", data.referer ?? "direct");
  params.set("device", data.device?.type ?? "desktop");
  params.set("browser", data.browser?.name ?? "chrome");
  params.set("os", data.os?.name ?? "windows");
}
