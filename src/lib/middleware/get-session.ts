import { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getTemporarySession, setTemporarySession, hashKey } from "@/lib/redis";

export interface SessionResult {
  isAuthenticated: boolean;
  token: boolean;
}

// Cache TTL configuration - optimized for middleware performance
const AUTHENTICATED_CACHE_TTL = 60 * 15; // 15 minutes for authenticated sessions
const UNAUTHENTICATED_CACHE_TTL = 60 * 2; // 2 minutes for unauthenticated (shorter to catch new logins)
const SESSION_PRESENCE_PREFIX = "sess:presence:";
const SESSION_TOKEN_COOKIE = "better-auth.session_token=";

function getCacheTTL(isAuthenticated: boolean): number {
  return isAuthenticated ? AUTHENTICATED_CACHE_TTL : UNAUTHENTICATED_CACHE_TTL;
}

function checkSessionInCookies(cookieHeader: string): boolean {
  return cookieHeader.includes(SESSION_TOKEN_COOKIE);
}

// Optimized session presence check for middleware
// Uses Redis to cache authentication status, avoiding database calls
export async function getCachedSession(
  req: NextRequest,
): Promise<SessionResult> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  
  // Early return for requests without cookies
  if (!cookieHeader) {
    return {
      isAuthenticated: false,
      token: false,
    };
  }

  // Try Redis cache first
  const sessionPresenceKey = `${SESSION_PRESENCE_PREFIX}${hashKey(cookieHeader)}`;
  const cachedPresence = await getTemporarySession<boolean>(sessionPresenceKey);
  
  if (cachedPresence !== null) {
    const isAuthenticated = Boolean(cachedPresence);
    return {
      isAuthenticated,
      token: isAuthenticated,
    };
  }

  // Cache miss - verify session cookie
  let isAuthenticated = false;

  try {
    const cookieToken = await getSessionCookie(req);
    isAuthenticated = Boolean(cookieToken);
  } catch (error) {
    // Fallback to simple cookie check if better-auth parsing fails
    isAuthenticated = checkSessionInCookies(cookieHeader);
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to get session cookie, using fallback:", error);
    }
  }

  // Cache the result in Redis
  const ttl = getCacheTTL(isAuthenticated);
  await setTemporarySession(sessionPresenceKey, isAuthenticated, ttl);

  return {
    isAuthenticated,
    token: isAuthenticated,
  };
}
