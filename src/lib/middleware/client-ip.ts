import { normalizeIp } from "./rate-limit";

/**
 * Single client-IP extractor for rate limiting AND analytics. Behind
 * Cloudflare → Vercel the leftmost `x-forwarded-for` hop is the viewer;
 * the rightmost is the nearest proxy (often the CF edge itself), so using
 * it collapses all CF-fronted viewers onto one IP for throttling while
 * analytics counts them separately. One helper keeps both consistent.
 *
 * Trust order: platform-injected values first, never client-spoofable
 * `cf-connecting-ip` unless Cloudflare is provably in front (cf-ray).
 */
export function getClientIp(
  headers: Pick<Headers, "get">,
  fallback = "unknown",
): string {
  const hasCloudflare = Boolean(headers.get("cf-ray"));
  const forwarded = headers.get("x-forwarded-for");
  const hops = forwarded
    ?.split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  const ip =
    (hasCloudflare ? headers.get("cf-connecting-ip") : null) ||
    headers.get("x-real-ip") ||
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    hops?.[0] ||
    fallback;

  return normalizeIp(ip);
}
