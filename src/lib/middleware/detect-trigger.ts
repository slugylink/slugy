import { NextRequest } from "next/server";
import { METADATA_BOT_PATTERNS } from "./bot-patterns";

export type TriggerType =
  | "bot"
  | "prefetch"
  | "api"
  | "qr"
  | "email"
  | "social"
  | "campaign"
  | "direct"
  | "link";

const EMAIL_HOSTS = [
  "mail.google.com",
  "outlook.live.com",
  "mail.yahoo.com",
  "proton.me",
  "mail.apple.com",
] as const;

const SOCIAL_DOMAINS = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "instagram.com",
  "t.co",
  "tiktok.com",
  "pinterest.com",
  "reddit.com",
  "youtube.com",
  "whatsapp.com",
  "telegram.org",
] as const;

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

const BOT_REGEX =
  /(bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|pingdom|gtmetrix|headless|cf-|headlesschrome|phantomjs)|\bprerender\b/i;

const EMAIL_REGEX = /mail|email/i;
const QR_REGEX = /qr|qrcode/i;

/**
 * Extracts the host from a referer URL
 */
function extractRefererHost(referer: string): string {
  if (!referer) return "";
  try {
    return new URL(referer).host.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Checks if the user agent matches bot patterns
 */
function isBotUserAgent(ua: string): boolean {
  const isMetadataBot = METADATA_BOT_PATTERNS.some((pattern) =>
    ua.includes(pattern.toLowerCase()),
  );
  return isMetadataBot || BOT_REGEX.test(ua);
}

/**
 * Returns the trigger type for a short‐link click event.
 * Possible values: bot, prefetch, api, qr, email, social, campaign, direct, link
 */
export function detectTrigger(
  req: NextRequest,
  destinationUrl?: string,
): TriggerType {
  const headers = req.headers;
  const refererRaw = headers.get("referer") || "";
  const ua = (headers.get("user-agent") || "").toLowerCase();
  const purpose = headers.get("purpose") || headers.get("sec-purpose") || "";
  const isNextData = headers.has("next-url");
  const refererHost = extractRefererHost(refererRaw);
  const viaParam = req.nextUrl.searchParams.get("via")?.toLowerCase();
  const requestParams = req.nextUrl.searchParams;
  let destinationParams: URLSearchParams | null = null;
  try {
    if (destinationUrl)
      destinationParams = new URL(destinationUrl).searchParams;
  } catch {
    destinationParams = null;
  }

  const hasParam = (name: string) =>
    requestParams.has(name) || Boolean(destinationParams?.has(name));

  const getParam = (name: string) =>
    requestParams.get(name) ?? destinationParams?.get(name) ?? null;

  // Bot detection (highest priority)
  if (isBotUserAgent(ua)) {
    return "bot";
  }

  // Prefetch detection
  if (purpose.toLowerCase() === "prefetch" || isNextData) {
    return "prefetch";
  }

  // API request detection
  if (headers.get("x-requested-with") === "XMLHttpRequest") {
    return "api";
  }

  // QR code detection
  if (
    QR_REGEX.test(ua) ||
    hasParam("qr") ||
    viaParam === "qr" ||
    viaParam === "qrcode"
  ) {
    return "qr";
  }

  // Email detection
  if (
    EMAIL_HOSTS.some((host) => refererHost.endsWith(host)) ||
    EMAIL_REGEX.test(refererRaw) ||
    getParam("utm_medium") === "email"
  ) {
    return "email";
  }

  // Social media detection
  if (SOCIAL_DOMAINS.some((domain) => refererHost.endsWith(domain))) {
    return "social";
  }

  // Campaign detection (UTM parameters on short link or destination)
  if (UTM_PARAMS.some((param) => hasParam(param))) {
    return "campaign";
  }

  // Explicit ref attribution (short link or destination)
  if (hasParam("ref")) {
    return "link";
  }

  // Direct traffic (no referer)
  if (!refererRaw) {
    return "direct";
  }

  // Default: link click
  return "link";
}
