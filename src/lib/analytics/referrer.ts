export const DIRECT_REFERER = "Direct";

const MAX_REFERER_LENGTH = 512;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Wrapper / subdomain → canonical host shown in analytics. */
const HOST_ALIASES: Record<string, string> = {
  // X / Twitter (t.co is X's link wrapper — the main under-attributed source)
  "t.co": "x.com",
  "twitter.com": "x.com",
  "mobile.twitter.com": "x.com",
  "m.twitter.com": "x.com",
  // Instagram
  "l.instagram.com": "instagram.com",
  "m.instagram.com": "instagram.com",
  // Facebook
  "l.facebook.com": "facebook.com",
  "lm.facebook.com": "facebook.com",
  "m.facebook.com": "facebook.com",
  "web.facebook.com": "facebook.com",
  "fb.me": "facebook.com",
  "fb.com": "facebook.com",
  "facebook.com": "facebook.com",
  // LinkedIn (lnkd.in is LinkedIn's shortener)
  "lnkd.in": "linkedin.com",
  "ln.linkedin.com": "linkedin.com",
  // TikTok
  "vm.tiktok.com": "tiktok.com",
  "vt.tiktok.com": "tiktok.com",
  "m.tiktok.com": "tiktok.com",
  // YouTube
  "youtu.be": "youtube.com",
  "m.youtube.com": "youtube.com",
  "music.youtube.com": "youtube.com",
  // Reddit
  "old.reddit.com": "reddit.com",
  "new.reddit.com": "reddit.com",
  "m.reddit.com": "reddit.com",
  "out.reddit.com": "reddit.com",
  // WhatsApp
  "wa.me": "whatsapp.com",
  "api.whatsapp.com": "whatsapp.com",
  "chat.whatsapp.com": "whatsapp.com",
  // Telegram
  "t.me": "telegram.org",
  "telegram.me": "telegram.org",
  // Pinterest
  "pin.it": "pinterest.com",
  // Others
  "l.messenger.com": "messenger.com",
  "m.messenger.com": "messenger.com",
  "discord.gg": "discord.com",
  "discordapp.com": "discord.com",
  "slack.com": "slack.com",
  "teams.microsoft.com": "teams.microsoft.com",
  "teams.live.com": "teams.microsoft.com",
};

/** Common utm_source values → canonical host. */
const UTM_SOURCE_ALIASES: Record<string, string> = {
  x: "x.com",
  twitter: "x.com",
  tw: "x.com",
  tweet: "x.com",
  ig: "instagram.com",
  insta: "instagram.com",
  instagram: "instagram.com",
  fb: "facebook.com",
  facebook: "facebook.com",
  li: "linkedin.com",
  linkedin: "linkedin.com",
  tiktok: "tiktok.com",
  tt: "tiktok.com",
  yt: "youtube.com",
  youtube: "youtube.com",
  reddit: "reddit.com",
  wa: "whatsapp.com",
  whatsapp: "whatsapp.com",
  tg: "telegram.org",
  telegram: "telegram.org",
  pinterest: "pinterest.com",
  discord: "discord.com",
  slack: "slack.com",
  google: "google.com",
  bing: "bing.com",
  yahoo: "yahoo.com",
  duckduckgo: "duckduckgo.com",
};

function canonicalizeHost(host: string): string {
  const lower = host.toLowerCase();
  if (HOST_ALIASES[lower]) return HOST_ALIASES[lower];
  // google.<tld> / bing.<tld> / yahoo.<tld> variants
  if (/^google\.[a-z.]{2,}$/.test(lower)) return "google.com";
  if (/^bing\.[a-z.]{2,}$/.test(lower)) return "bing.com";
  if (/^yahoo\.[a-z.]{2,}$/.test(lower)) return "yahoo.com";
  if (/^duckduckgo\.[a-z.]{2,}$/.test(lower)) return "duckduckgo.com";
  return lower;
}

function extractHost(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const decoded = safeDecode(trimmed);
  const withProto = /^https?:\/\//i.test(decoded)
    ? decoded
    : /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(decoded)
      ? `https://${decoded}`
      : null;
  if (!withProto) return null;
  try {
    const url = new URL(withProto);
    let host = url.hostname.toLowerCase();
    if (!host || host === "localhost") return host || null;
    if (host.startsWith("www.")) host = host.slice(4);
    return canonicalizeHost(host);
  } catch {
    return null;
  }
}

/**
 * Normalize any stored/displayed referrer value to its canonical form so
 * historical rows (e.g. "https://t.co") group with new rows ("x.com").
 */
export function canonicalizeRefererDisplay(
  value: string | null | undefined,
): string {
  if (!value) return DIRECT_REFERER;
  const trimmed = value.trim();
  if (!trimmed) return DIRECT_REFERER;
  if (/^direct$/i.test(trimmed) || /^unknown$/i.test(trimmed))
    return DIRECT_REFERER;
  const host = extractHost(trimmed);
  if (host) return host;
  const lower = trimmed.toLowerCase();
  if (UTM_SOURCE_ALIASES[lower]) return UTM_SOURCE_ALIASES[lower];
  return trimmed.slice(0, MAX_REFERER_LENGTH);
}

function normalizeUtmSource(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (UTM_SOURCE_ALIASES[lower]) return UTM_SOURCE_ALIASES[lower];
  const host = extractHost(trimmed);
  return host ?? trimmed.slice(0, MAX_REFERER_LENGTH);
}

export interface ResolveRefererInput {
  /** Explicit override (?ref=, ?via=, ?source=). Highest priority. */
  refParam?: string | null;
  /** Raw Referer / Referrer header value. */
  headerReferer?: string | null;
  /** utm_source from short-link or destination URL. Fallback when header is empty. */
  utmSource?: string | null;
  /** Hosts treated as self-traffic (own dashboard, short domain, destination). */
  excludeHosts?: Array<string | null | undefined>;
}

function buildExcludeSet(
  excludeHosts?: Array<string | null | undefined>,
): Set<string> {
  const set = new Set<string>(["slugy.co", "www.slugy.co"]);
  for (const h of excludeHosts ?? []) {
    if (!h) continue;
    const host =
      extractHost(h) ??
      h
        .trim()
        .toLowerCase()
        .replace(/^www\./, "");
    if (host) set.add(host);
  }
  return set;
}

/**
 * Resolve the analytics referrer.
 *
 * Priority: explicit ?ref= → Referer header → utm_source → Direct.
 * Self-traffic (own short domain / destination host) falls through to Direct.
 * Wrapper domains (t.co, lnkd.in, l.instagram.com…) map to their canonical
 * network so X / LinkedIn / Instagram clicks stop hiding under "Direct"
 * or fragmented shortener hosts.
 */
export function resolveReferer(input: ResolveRefererInput): string {
  const excluded = buildExcludeSet(input.excludeHosts);

  const fromRef = input.refParam?.trim()
    ? (extractHost(input.refParam) ??
      normalizeUtmSource(input.refParam) ??
      input.refParam.trim().slice(0, MAX_REFERER_LENGTH))
    : null;
  if (
    fromRef &&
    fromRef !== DIRECT_REFERER &&
    !excluded.has(fromRef.toLowerCase())
  ) {
    return fromRef;
  }

  const fromHeader = input.headerReferer?.trim()
    ? extractHost(input.headerReferer)
    : null;
  if (
    fromHeader &&
    fromHeader !== DIRECT_REFERER &&
    !excluded.has(fromHeader.toLowerCase())
  ) {
    return fromHeader;
  }

  // Header missing (in-app browsers, mobile apps, noreferrer) or self-traffic:
  // fall back to utm_source so tagged shares still attribute correctly.
  const fromUtm = normalizeUtmSource(input.utmSource);
  if (
    fromUtm &&
    fromUtm !== DIRECT_REFERER &&
    !excluded.has(fromUtm.toLowerCase())
  ) {
    return fromUtm;
  }

  return DIRECT_REFERER;
}
