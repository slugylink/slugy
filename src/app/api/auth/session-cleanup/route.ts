import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "__Host-better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_data",
  "better-auth.dont_remember",
  "__Secure-better-auth.dont_remember",
];

function getRootDomain(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0]?.toLowerCase();
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }
  const parts = host.split(".");
  if (parts.length < 2) return null;
  return `.${parts.slice(-2).join(".")}`;
}

/**
 * Clears stale/invalid auth cookies then sends the user to login.
 * Used when a session cookie exists but the session is gone (logout/delete race).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/login";
  const secure = url.protocol === "https:";
  const rootDomain = getRootDomain(req.headers.get("host"));

  const response = NextResponse.redirect(new URL(next, url.origin), 303);

  const clear = (name: string, domain?: string) => {
    const parts = [
      `${name}=`,
      "Path=/",
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      "SameSite=Lax",
      "HttpOnly",
    ];
    if (secure) parts.push("Secure");
    if (domain) parts.push(`Domain=${domain}`);
    response.headers.append("Set-Cookie", parts.join("; "));
  };

  for (const name of AUTH_COOKIE_NAMES) {
    clear(name);
    if (rootDomain && !name.startsWith("__Host-")) {
      clear(name, rootDomain);
    }
  }

  return response;
}
