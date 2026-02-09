import { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getTemporarySession, setTemporarySession, hashKey } from "@/lib/redis";

export interface SessionResult {
  isAuthenticated: boolean;
  token: boolean;
}

// ─────────── Configuration ───────────

const CACHE_TTL = {
  AUTHENTICATED: 60 * 15, // 15 minutes - longer cache for active sessions
  UNAUTHENTICATED: 60 * 2, // 2 minutes - shorter to catch new logins quickly
} as const;

const SESSION_PRESENCE_PREFIX = "sess:presence:";
const SESSION_TOKEN_COOKIE = "better-auth.session_token=";

// ─────────── Helpers ───────────

const hasSessionCookie = (cookieHeader: string): boolean =>
  cookieHeader.includes(SESSION_TOKEN_COOKIE);

const getCacheTTL = (isAuthenticated: boolean): number =>
  isAuthenticated ? CACHE_TTL.AUTHENTICATED : CACHE_TTL.UNAUTHENTICATED;

const createSessionResult = (isAuthenticated: boolean): SessionResult => ({
  isAuthenticated,
  token: isAuthenticated,
});

// ─────────── Main Function ───────────

/**
 * Optimized session presence check for middleware.
 * Uses Redis to cache authentication status, avoiding database calls.
 * 
 * Flow:
 * 1. Check for cookies (early return if none)
 * 2. Check Redis cache
 * 3. Verify session cookie (cache miss)
 * 4. Cache result in Redis
 */
export async function getCachedSession(
  req: NextRequest,
): Promise<SessionResult> {
  const cookieHeader = req.headers.get("cookie");

  // Early return for requests without cookies
  if (!cookieHeader) {
    return createSessionResult(false);
  }

  // Check Redis cache
  const cacheKey = `${SESSION_PRESENCE_PREFIX}${hashKey(cookieHeader)}`;
  const cachedPresence = await getTemporarySession<boolean>(cacheKey);

  if (cachedPresence !== null) {
    return createSessionResult(Boolean(cachedPresence));
  }

  // Cache miss - verify session cookie
  const isAuthenticated = await verifySessionCookie(req, cookieHeader);

  // Cache the result
  await setTemporarySession(cacheKey, isAuthenticated, getCacheTTL(isAuthenticated));

  return createSessionResult(isAuthenticated);
}

// ─────────── Session Verification ───────────

async function verifySessionCookie(
  req: NextRequest,
  cookieHeader: string,
): Promise<boolean> {
  try {
    const cookieToken = await getSessionCookie(req);
    return Boolean(cookieToken);
  } catch (error) {
    // Fallback to simple cookie check if better-auth parsing fails
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to parse session cookie, using fallback:", error);
    }
    return hasSessionCookie(cookieHeader);
  }
}