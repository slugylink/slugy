import { neon } from "@neondatabase/serverless";
import type { NextRequest } from "next/server";

import { hashKey, redis } from "@/lib/redis";

import { getSessionToken } from "./get-session-token";

const MW_USER_PREFIX = "workspace:mw:user:";
const MW_SESSION_PREFIX = "workspace:mw:session:";
const MW_REDIRECT_NONE = "__onboarding__";
const MW_REDIRECT_CACHE_TTL = 60 * 5;
const MW_SESSION_USER_TTL = 60 * 60;

export type WorkspaceRedirectResult =
  | { status: "redirect"; slug: string }
  | { status: "onboarding" }
  | { status: "fallback" };

function userRedirectCacheKey(userId: string): string {
  return `${MW_USER_PREFIX}${userId}`;
}

function sessionUserCacheKey(sessionToken: string): string {
  return `${MW_SESSION_PREFIX}${hashKey(sessionToken)}`;
}

async function readCachedSlug(
  userId: string,
): Promise<string | null | undefined> {
  try {
    const cached = await redis.get<string>(userRedirectCacheKey(userId));
    if (cached === null || cached === undefined) return undefined;
    return cached;
  } catch {
    return undefined;
  }
}

async function writeCachedSlug(userId: string, value: string): Promise<void> {
  try {
    await redis.set(userRedirectCacheKey(userId), value, {
      ex: MW_REDIRECT_CACHE_TTL,
    });
  } catch {}
}

async function readCachedSessionUserId(
  sessionToken: string,
): Promise<string | null | undefined> {
  try {
    const cached = await redis.get<string>(sessionUserCacheKey(sessionToken));
    if (cached === null || cached === undefined) return undefined;
    return cached;
  } catch {
    return undefined;
  }
}

async function writeCachedSessionUserId(
  sessionToken: string,
  userId: string,
): Promise<void> {
  try {
    await redis.set(sessionUserCacheKey(sessionToken), userId, {
      ex: MW_SESSION_USER_TTL,
    });
  } catch {}
}

async function lookupSessionUserId(
  sessionToken: string,
): Promise<string | null> {
  const cached = await readCachedSessionUserId(sessionToken);
  if (typeof cached === "string" && cached.length > 0) return cached;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT "userId"
    FROM session
    WHERE token = ${sessionToken}
      AND "expiresAt" > NOW()
    LIMIT 1
  `;

  const userId = rows[0]?.userId;
  if (typeof userId === "string" && userId.length > 0) {
    await writeCachedSessionUserId(sessionToken, userId);
    return userId;
  }

  return null;
}

async function lookupDefaultWorkspaceSlug(
  userId: string,
): Promise<string | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT slug
    FROM workspace
    WHERE "userId" = ${userId}
      AND "isDefault" = true
      AND "deletedAt" IS NULL
    LIMIT 1
  `;

  const slug = rows[0]?.slug;
  return typeof slug === "string" && slug.length > 0 ? slug : null;
}

export async function invalidateMiddlewareWorkspaceRedirectCache(
  userId: string,
): Promise<void> {
  try {
    await redis.del(userRedirectCacheKey(userId));
  } catch {}
}

export async function warmDefaultWorkspaceRedirectCache(
  userId: string,
  slug: string | null,
): Promise<void> {
  await writeCachedSlug(
    userId,
    slug && slug.length > 0 ? slug : MW_REDIRECT_NONE,
  );
}

export async function resolveDefaultWorkspaceRedirect(
  req: NextRequest,
): Promise<WorkspaceRedirectResult> {
  const sessionToken = await getSessionToken(req);
  if (!sessionToken) return { status: "fallback" };

  try {
    const userId = await lookupSessionUserId(sessionToken);
    if (!userId) return { status: "fallback" };

    const cached = await readCachedSlug(userId);
    if (cached === MW_REDIRECT_NONE) {
      return { status: "onboarding" };
    }
    if (typeof cached === "string" && cached.length > 0) {
      return { status: "redirect", slug: cached };
    }

    const slug = await lookupDefaultWorkspaceSlug(userId);
    if (slug) {
      await writeCachedSlug(userId, slug);
      return { status: "redirect", slug };
    }

    await writeCachedSlug(userId, MW_REDIRECT_NONE);
    return { status: "onboarding" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Middleware default workspace lookup failed:", error);
    }
    return { status: "fallback" };
  }
}
