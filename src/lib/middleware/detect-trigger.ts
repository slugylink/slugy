import { NextRequest } from "next/server";
import { METADATA_BOT_PATTERNS } from "./bot-patterns";

/**
 * Returns the trigger type for a short‐link click event.
 * Possible values: bot, prefetch, api, qr, email, social, campaign, direct, link
 */
export function detectTrigger(req: NextRequest): string {
  const headers = req.headers;
  const refererRaw = headers.get("referer") || "";
  const ua = (headers.get("user-agent") || "").toLowerCase();
  const purpose = headers.get("purpose") || headers.get("sec-purpose") || "";
  const isNextData = headers.has("next-url");
  // Extract host from referer
  let refererHost = "";
  try {
    if (refererRaw) {
      refererHost = new URL(refererRaw).host.toLowerCase();
    }
  } catch {
    refererHost = "";
  }

  // Enhanced bot detection using bot-patterns
  const isBot = METADATA_BOT_PATTERNS.some((pattern) =>
    ua.includes(pattern.toLowerCase()),
  );

  // Additional common bot patterns
  const botRegex =
    /(bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|pingdom|gtmetrix|headless|cf-|headlesschrome|phantomjs)|\bprerender\b/i;

  if (isBot || botRegex.test(ua)) {
    return "bot";
  }

  if (purpose.toLowerCase() === "prefetch" || isNextData) {
    return "prefetch";
  }

  if (headers.get("x-requested-with") === "XMLHttpRequest") {
    return "api";
  }

  if (/qr|qrcode/.test(ua) || req.nextUrl.searchParams.has("qr")) {
    return "qr";
  }

  const emailHosts = [
    "mail.google.com",
    "outlook.live.com",
    "mail.yahoo.com",
    "proton.me",
    "mail.apple.com",
  ];
  if (
    emailHosts.some((h) => refererHost.endsWith(h)) ||
    /mail|email/.test(refererRaw) ||
    req.nextUrl.searchParams.get("utm_medium") === "email"
  ) {
    return "email";
  }

  const socialDomains = [
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
  ];
  if (socialDomains.some((d) => refererHost.endsWith(d))) {
    return "social";
  }

  const utmParams = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];
  if (utmParams.some((p) => req.nextUrl.searchParams.has(p))) {
    return "campaign";
  }

  if (!refererRaw) {
    return "direct";
  }

  return "link";
}
