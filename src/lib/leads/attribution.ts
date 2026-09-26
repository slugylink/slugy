import {
  SLUGY_ID_COOKIE,
  SLUGY_ID_COOKIE_MAX_AGE,
  SLUGY_ID_PARAM,
} from "@/lib/leads/constants";

export { SLUGY_ID_COOKIE, SLUGY_ID_COOKIE_MAX_AGE, SLUGY_ID_PARAM };

/** Parent-domain cookie scope so slugy.co + app.slugy.co share attribution. */
export function getAttributionCookieDomain(): string | undefined {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (!root) return undefined;
  const host = root.split(":")[0]?.toLowerCase();
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return undefined;
  }
  return host.startsWith(".") ? host : `.${host}`;
}

/** Read attribution id from query (first hit) or first-party cookie. */
export function getSlugyId(): string | null {
  if (typeof window === "undefined") return null;

  const fromQuery = new URLSearchParams(window.location.search).get(
    SLUGY_ID_PARAM,
  );
  if (fromQuery) return fromQuery;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${SLUGY_ID_COOKIE}=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function setSlugyIdCookie(id: string, maxAge = SLUGY_ID_COOKIE_MAX_AGE) {
  if (typeof document === "undefined") return;
  const domain = getAttributionCookieDomain();
  document.cookie =
    `${SLUGY_ID_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; SameSite=Lax` +
    (domain ? `; Domain=${domain}` : "");
}

/** Append current slugy_id to an app URL (covers localhost where cookies can't be shared). */
export function withSlugyId(href: string): string {
  if (typeof window === "undefined") return href;
  try {
    const id = getSlugyId();
    if (!id) return href;
    const url = new URL(href, window.location.origin);
    if (!url.searchParams.get(SLUGY_ID_PARAM)) {
      url.searchParams.set(SLUGY_ID_PARAM, id);
    }
    // Keep absolute URLs absolute, relative URLs relative.
    if (/^https?:\/\//i.test(href)) return url.toString();
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/** Parse slugy_id out of a raw Cookie header (server-side). */
export function getSlugyIdFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SLUGY_ID_COOKIE}=([^;]*)`),
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim() || null;
  }
}
