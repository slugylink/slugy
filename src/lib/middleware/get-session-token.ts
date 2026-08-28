import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_PATTERN =
  /(?:^|;\s*)(?:(?:__Secure-|__Host-)?better-auth\.session_token)=([^;]+)/;

export function getSessionTokenFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader.match(SESSION_COOKIE_PATTERN);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return null;
}

export async function getSessionToken(
  req: NextRequest,
): Promise<string | null> {
  const fromHeader = getSessionTokenFromCookieHeader(req.headers.get("cookie"));
  if (fromHeader) return fromHeader;

  try {
    return (await getSessionCookie(req)) ?? null;
  } catch {
    return null;
  }
}
