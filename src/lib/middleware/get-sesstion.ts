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

export async function getCachedSession(req: NextRequest): Promise<SessionResult> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const sessionPresenceKey = cookieHeader
    ? `sess:presence:${hashKey(cookieHeader)}`
    : "";
  
  let isAuthenticated = false;
  
  if (sessionPresenceKey) {
    const cachedPresence = await getTemporarySession<boolean>(sessionPresenceKey);
    if (cachedPresence !== null) {
      isAuthenticated = Boolean(cachedPresence);
    } else {
      const cookieToken = getSessionCookie(req);
      isAuthenticated = Boolean(cookieToken);
      const ttl = isAuthenticated ? 60 * 8 : 60 * 2; // 8min for auth, 2min for unauth
      await setTemporarySession(sessionPresenceKey, isAuthenticated, ttl);
      console.log(`cache miss - stored ${isAuthenticated ? 'auth' : 'unauth'} for ${ttl/60}min`);
    }
  }
  
  return {
    isAuthenticated,
    token: isAuthenticated,
  };
}
