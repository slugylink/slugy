import { type NextRequest, userAgent } from "next/server";
import { getGeoData } from "@/lib/analytics/geo";

const BOT_REGEX =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Pinterest|vkShare|redditbot|Applebot|WhatsApp|TelegramBot|Discordbot|Slackbot|Viber|Microlink|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|Thunderbird|Outlook-iOS|Outlook-Android|Feedly|Feedspot|Feedbin|NewsBlur|ia_archiver|archive\.org_bot|Uptimebot|Monitis|NewRelicPinger|Postman|insomnia|HeadlessChrome|bot|chatgpt|bluesky|bing|duckduckbot|yandex|baidu|teoma|slurp|MetaInspector|iframely|spider|Go-http-client|preview|prerender|msn/i;

/**
 * Checks if the request is coming from a metadata preview bot
 */
function isMetadataPreviewBot(req: NextRequest): boolean {
  const uaString = req.headers.get("user-agent")?.toLowerCase() ?? "";
  return BOT_REGEX.test(uaString) || (userAgent(req).isBot ?? false);
}

/**
 * Extracts user agent and geo data from the request.
 */
export function extractUserAgentData(req: NextRequest) {
  const isBot = isMetadataPreviewBot(req);
  const ua = userAgent(req);
  const geoData = getGeoData(req);

  return {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "Unknown",
    country: geoData.country,
    city: geoData.city,
    region: geoData.region,
    continent: geoData.continent,
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
  params.set("referer", data.referer ?? "Direct");
  params.set("device", data.device?.type ?? "desktop");
  params.set("browser", data.browser?.name ?? "chrome");
  params.set("os", data.os?.name ?? "windows");
}
