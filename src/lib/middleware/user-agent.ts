import { type NextRequest, userAgent } from "next/server";
import { headers } from "next/headers";

// Pre-compile regex for better performance
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
export async function extractUserAgentData(req: NextRequest) {
  const isBot = isMetadataPreviewBot(req);
  const headersList = await headers();

  return {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    country: req.headers.get("x-vercel-ip-country") ?? "unknown",
    city: req.headers.get("x-vercel-ip-city") ?? "unknown",
    region: req.headers.get("x-vercel-ip-country-region") ?? "unknown",
    continent: req.headers.get("x-vercel-ip-continent") ?? "unknown",
    referer: req.headers.get("referer") ?? "direct",
    device: headersList.get("x-device-type") || "unknown",
    browser: headersList.get("x-browser-name") || "unknown",
    os: headersList.get("x-os-name") || "unknown",
    isBot,
  };
}
