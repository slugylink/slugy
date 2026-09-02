import type { NextRequest, NextResponse } from "next/server";

/** Last-used workspace slug. Middleware reads this to skip Redis/DB on `/`. */
export const WORKSPACE_COOKIE_NAME = "slugy_workspace";

export const WORKSPACE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const WORKSPACE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED_APP_SEGMENTS = new Set([
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "verify-email",
  "email-verified",
  "onboarding",
  "accept-invitation",
  "send-invitation",
  "invite",
  "upgrade",
  "bio-links",
  "account",
  "theme",
  "testz",
  "app",
  "api",
  "admin",
  "monitoring",
  "test",
  "pricing",
  "features",
  "about",
  "contact",
  "blogs",
  "terms",
  "privacy",
  "404",
  "500",
  "not-found",
]);

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

function cookieDomain(): string | undefined {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (!root) return undefined;

  const host = root.split(":")[0]?.toLowerCase();
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return undefined;
  }

  return host.startsWith(".") ? host : `.${host}`;
}

export function parseWorkspaceSlug(
  value: string | undefined | null,
): string | null {
  if (!value) return null;

  let slug = value.trim();
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // keep raw value
  }

  if (slug.length < 1 || slug.length > 30) return null;
  if (!WORKSPACE_SLUG_RE.test(slug)) return null;
  if (RESERVED_APP_SEGMENTS.has(slug)) return null;

  return slug;
}

export function workspaceSlugFromPath(pathname: string): string | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  return parseWorkspaceSlug(segment);
}

export function getWorkspaceCookie(req: NextRequest): string | null {
  return parseWorkspaceSlug(req.cookies.get(WORKSPACE_COOKIE_NAME)?.value);
}

export function applyWorkspaceCookie(
  response: NextResponse,
  slug: string,
): NextResponse {
  const parsed = parseWorkspaceSlug(slug);
  if (!parsed) return response;

  response.cookies.set(WORKSPACE_COOKIE_NAME, parsed, {
    path: "/",
    maxAge: WORKSPACE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: cookieSecure(),
    httpOnly: false,
    ...(cookieDomain() ? { domain: cookieDomain() } : {}),
  });

  return response;
}

export function clearWorkspaceCookie(response: NextResponse): NextResponse {
  response.cookies.set(WORKSPACE_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: cookieSecure(),
    httpOnly: false,
    ...(cookieDomain() ? { domain: cookieDomain() } : {}),
  });
  return response;
}

function clientCookieSuffix(): string {
  const parts = ["Path=/", "SameSite=Lax"];
  const domain = cookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/** Persist last workspace in the browser (workspace switcher / create). */
export function persistWorkspaceSlugCookie(slug: string): void {
  if (typeof document === "undefined") return;
  const parsed = parseWorkspaceSlug(slug);
  if (!parsed) return;

  document.cookie = [
    `${WORKSPACE_COOKIE_NAME}=${encodeURIComponent(parsed)}`,
    `Max-Age=${WORKSPACE_COOKIE_MAX_AGE}`,
    clientCookieSuffix(),
  ].join("; ");
}

export function clearWorkspaceSlugCookie(): void {
  if (typeof document === "undefined") return;

  const expired = [
    `${WORKSPACE_COOKIE_NAME}=`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Path=/",
    "SameSite=Lax",
  ];
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    expired.push("Secure");
  }

  document.cookie = expired.join("; ");
  const domain = cookieDomain();
  if (domain) {
    document.cookie = [...expired, `Domain=${domain}`].join("; ");
  }
}
