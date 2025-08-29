import { NextRequest } from "next/server";
import { getCookieCache } from "better-auth/cookies";
import { getTemporarySession, setTemporarySession, hashKey } from "@/lib/redis";

/**
 * Cached session management for middleware performance optimization.
 * Uses Redis to cache session presence (boolean) to avoid repeated cookie parsing.
 */

export interface SessionResult {
  isAuthenticated: boolean;
  token: boolean;
}

// Cookie patterns to check for session presence
const SESSION_COOKIE_PATTERNS = [
  "auth-session=",
  "session=",
  "token=",
  "auth=",
  "__Secure-auth=",
  "__Host-auth=",
  "better-auth.session_token=",
  "better-auth.session=",
  "better-auth.token=",
] as const;

/**
 * Check if cookie header contains any session cookie patterns
 */
function hasSessionCookie(cookieHeader: string): boolean {
  return SESSION_COOKIE_PATTERNS.some(pattern => cookieHeader.includes(pattern));
}

export async function getCachedSession(
  req: NextRequest,
): Promise<SessionResult> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  
  if (!cookieHeader) {
    return { isAuthenticated: false, token: false };
  }

  const sessionPresenceKey = `sess:presence:${hashKey(cookieHeader)}`;
  
  // Check Redis cache first
  const cachedPresence = await getTemporarySession<boolean>(sessionPresenceKey);
  if (cachedPresence !== null) {
    return {
      isAuthenticated: Boolean(cachedPresence),
      token: Boolean(cachedPresence),
    };
  }

  // Cache miss - determine authentication status
  let isAuthenticated = false;

  try {
    // Try getCookieCache first for optimized cookie handling
    const cookieCache = await getCookieCache(req);
    if (cookieCache?.session) {
      isAuthenticated = true;
    }
  } catch (error) {
    // getCookieCache failed - will use fallback
  }

  // Fallback to pattern matching if getCookieCache didn't work
  if (!isAuthenticated) {
    isAuthenticated = hasSessionCookie(cookieHeader);
  }

  // Cache the result
  const ttl = isAuthenticated ? 60 * 10 : 60 * 2; // 10min for auth, 2min for unauth
  await setTemporarySession(sessionPresenceKey, isAuthenticated, ttl);

  return {
    isAuthenticated,
    token: isAuthenticated,
  };
}
