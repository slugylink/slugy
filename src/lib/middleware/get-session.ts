import { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getTemporarySession, setTemporarySession, hashKey } from "@/lib/redis";

export interface SessionResult {
  isAuthenticated: boolean;
  token: boolean;
}

const AUTHENTICATED_CACHE_TTL = 60 * 15;
const UNAUTHENTICATED_CACHE_TTL = 60 * 2;
const SESSION_TOKEN_COOKIE = "better-auth.session_token=";

function getCacheTTL(isAuthenticated: boolean): number {
  return isAuthenticated ? AUTHENTICATED_CACHE_TTL : UNAUTHENTICATED_CACHE_TTL;
}

function checkSessionInCookies(cookieHeader: string): boolean {
  return cookieHeader.includes(SESSION_TOKEN_COOKIE);
}

export async function getCachedSession(
  req: NextRequest,
): Promise<SessionResult> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  
  if (!cookieHeader) {
    return {
      isAuthenticated: false,
      token: false,
    };
  }

  const sessionPresenceKey = `sess:presence:${hashKey(cookieHeader)}`;
  const cachedPresence = await getTemporarySession<boolean>(sessionPresenceKey);
  
  if (cachedPresence !== null) {
    const isAuthenticated = Boolean(cachedPresence);
    return {
      isAuthenticated,
      token: isAuthenticated,
    };
  }

  let isAuthenticated = false;

  try {
    const cookieToken = await getSessionCookie(req);
    isAuthenticated = Boolean(cookieToken);
  } catch (error) {
    isAuthenticated = checkSessionInCookies(cookieHeader);
    console.error("Failed to get session cookie, using fallback:", error);
  }

  const ttl = getCacheTTL(isAuthenticated);
  await setTemporarySession(sessionPresenceKey, isAuthenticated, ttl);

  return {
    isAuthenticated,
    token: isAuthenticated,
  };
}
