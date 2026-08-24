import { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { deleteTemporarySession, hashKey } from "@/lib/redis";

export interface SessionResult {
  isAuthenticated: boolean;
  token: boolean;
}

const SESSION_PRESENCE_PREFIX = "sess:presence:";

const hasSessionCookie = (cookieHeader: string): boolean =>
  cookieHeader.includes("better-auth.session_token=") ||
  cookieHeader.includes("__Secure-better-auth.session_token=") ||
  cookieHeader.includes("__Host-better-auth.session_token=");

const createSessionResult = (isAuthenticated: boolean): SessionResult => ({
  isAuthenticated,
  token: isAuthenticated,
});

const presenceCacheKey = (cookieHeader: string) =>
  `${SESSION_PRESENCE_PREFIX}${hashKey(cookieHeader)}`;

/** Drop any legacy middleware auth-presence cache entry. */
export async function invalidateSessionPresenceCache(
  cookieHeader: string | null,
): Promise<void> {
  if (!cookieHeader) return;
  await deleteTemporarySession(presenceCacheKey(cookieHeader));
}

/**
 * Middleware session gate: cookie presence is enough.
 * Full validation happens in getAuthSession() on the page/API.
 *
 * We intentionally do not Redis-cache "logged out" here — a false negative
 * was sending users with a valid session cookie to /login after reopening tabs.
 */
export async function getCachedSession(
  req: NextRequest,
): Promise<SessionResult> {
  const cookieHeader = req.headers.get("cookie");

  if (!cookieHeader) {
    return createSessionResult(false);
  }

  if (hasSessionCookie(cookieHeader)) {
    return createSessionResult(true);
  }

  try {
    const cookieToken = await getSessionCookie(req);
    return createSessionResult(Boolean(cookieToken));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to parse session cookie:", error);
    }
    return createSessionResult(false);
  }
}
