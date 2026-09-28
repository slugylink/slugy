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
  // Owned default first, then any owned workspace, then member workspaces —
  // invited-only users must land in their workspace, not onboarding.
  const rows = await sql`
    SELECT w.slug
    FROM workspace w
    LEFT JOIN member m
      ON m."workspaceId" = w.id AND m."userId" = ${userId}
    WHERE (w."userId" = ${userId} OR m."userId" = ${userId})
      AND w."deletedAt" IS NULL
    ORDER BY
      CASE
        WHEN w."userId" = ${userId} AND w."isDefault" = true THEN 0
        WHEN w."userId" = ${userId} THEN 1
        ELSE 2
      END,
      w."createdAt" ASC
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

/** Session user behind a middleware request (cached session→user mapping). */
export async function resolveMiddlewareUserId(
  req: NextRequest,
): Promise<string | null> {
  try {
    const sessionToken = await getSessionToken(req);
    if (!sessionToken) return null;
    return await lookupSessionUserId(sessionToken);
  } catch {
    return null;
  }
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

/**
 * Validate a workspace-slug cookie against the CURRENT user. The cookie is
 * browser state, not auth state — after logout/login as someone else it can
 * still hold the previous account's slug. Blindly redirecting leaks users
 * into another account's workspace (or a NotFound page). Returns the slug
 * only when this user can actually access it.
 */
export async function validateWorkspaceSlugForUser(
  userId: string,
  slug: string,
): Promise<string | null> {
  if (!slug || slug.length > 64) return null;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  try {
    const sql = neon(databaseUrl);
    const rows = await sql`
      SELECT w.slug
      FROM workspace w
      LEFT JOIN member m
        ON m."workspaceId" = w.id AND m."userId" = ${userId}
      WHERE w.slug = ${slug}
        AND (w."userId" = ${userId} OR m."userId" = ${userId})
        AND w."deletedAt" IS NULL
      LIMIT 1
    `;
    const valid = rows[0]?.slug;
    return typeof valid === "string" && valid.length > 0 ? valid : null;
  } catch {
    // Fail closed on DB error: fall through to the default-workspace lookup
    // instead of trusting a potentially foreign slug.
    return null;
  }
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
