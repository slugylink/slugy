import { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getTemporarySession, setTemporarySession, hashKey } from "@/lib/redis";

/**
 * Cached session management for middleware performance optimization.
 * Uses Redis to cache session presence (boolean) to avoid repeated cookie parsing.
 */

export interface SessionResult {
  isAuthenticated: boolean;
  token: boolean;
}

export async function getCachedSession(
  req: NextRequest,
): Promise<SessionResult> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const sessionPresenceKey = cookieHeader
    ? `sess:presence:${hashKey(cookieHeader)}`
    : "";

  let isAuthenticated = false;

  if (sessionPresenceKey) {
    const cachedPresence =
      await getTemporarySession<boolean>(sessionPresenceKey);
    if (cachedPresence !== null) {
      isAuthenticated = Boolean(cachedPresence);
    } else {
      try {
        const cookieToken = await getSessionCookie(req);
        isAuthenticated = Boolean(cookieToken);
        const ttl = isAuthenticated ? 60 * 8 : 60 * 2; // 8min for auth, 2min for unauth
        await setTemporarySession(sessionPresenceKey, isAuthenticated, ttl);
      } catch (error) {
        isAuthenticated =
          cookieHeader.includes("better-auth.session_token=") || false;
        const ttl = isAuthenticated ? 60 * 8 : 60 * 2; // 8min for auth, 2min for unauth
        await setTemporarySession(sessionPresenceKey, isAuthenticated, ttl);
        console.error("Failed to get session cookie:", error);
      }
    }
  }

  return {
    isAuthenticated,
    token: isAuthenticated,
  };
}
