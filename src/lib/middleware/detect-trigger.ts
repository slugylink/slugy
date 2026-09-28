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
  /(bot\b|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|bingbot|pingdom|gtmetrix|headless|cf-|headlesschrome|phantomjs|curl|wget|python|axios|okhttp|java\/|selenium|puppeteer|playwright|lighthouse)|\bprerender\b/i;

// Host-label match only: full-referer /mail|email/i misclassified news sites
// like dailymail.co.uk as email clicks.
const EMAIL_HOST_LABELS =
  /^(mail|email|webmail|inbox|gmail|yahoo|outlook|hotmail|live|proton|icloud|gmx|aol|zoho|yandex|fastmail|tutanota)$/i;
const QR_REGEX = /\bqr\b|qrcode/i;

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
 * Email referer: known provider hosts or a literal mail/webmail-style DNS
 * label — never a full-URL substring (dailymail.co.uk is not email).
 */
function isEmailReferer(refererHost: string): boolean {
  if (!refererHost) return false;
  if (EMAIL_HOSTS.some((host) => refererHost.endsWith(host))) return true;
  return refererHost.split(".").some((label) => EMAIL_HOST_LABELS.test(label));
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
  // Chrome/Safari send `Sec-Purpose: prefetch` (sometimes `prefetch;prerender`);
  // Next.js App Router sends `Next-Router-Prefetch`, Firefox `X-Moz: prefetch`.
  const purpose = (
    headers.get("purpose") ||
    headers.get("sec-purpose") ||
    ""
  ).toLowerCase();
  const isPrefetchHeader =
    headers.has("next-router-prefetch") ||
    headers.has("next-router-state-tree") ||
    (headers.get("x-moz") || "").toLowerCase() === "prefetch";
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

  // Prefetch detection (speculative loads, not human clicks)
  if (
    purpose.includes("prefetch") ||
    purpose.includes("prerender") ||
    isPrefetchHeader
  ) {
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
  if (isEmailReferer(refererHost) || getParam("utm_medium") === "email") {
    return "email";
  }

  // Social media detection (header first — actual click location wins)
  if (SOCIAL_DOMAINS.some((domain) => refererHost.endsWith(domain))) {
    return "social";
  }

  // In-app browsers (X, LinkedIn, Instagram, WhatsApp…) often strip the
  // Referer header — attribute tagged shares via utm_source instead.
  const utmSource = (getParam("utm_source") ?? "").toLowerCase().trim();
  if (utmSource) {
    const socialUtms = [
      "x",
      "twitter",
      "tw",
      "instagram",
      "ig",
      "facebook",
      "fb",
      "linkedin",
      "li",
      "tiktok",
      "tt",
      "youtube",
      "yt",
      "reddit",
      "whatsapp",
      "wa",
      "telegram",
      "tg",
      "pinterest",
      "discord",
      "slack",
      "x.com",
      "twitter.com",
      "instagram.com",
      "facebook.com",
      "linkedin.com",
      "lnkd.in",
      "t.co",
      "tiktok.com",
      "youtube.com",
      "youtu.be",
      "reddit.com",
      "whatsapp.com",
      "wa.me",
      "telegram.org",
      "t.me",
    ];
    if (socialUtms.includes(utmSource)) return "social";
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
