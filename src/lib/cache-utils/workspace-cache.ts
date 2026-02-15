import { redis, CACHE_BASE_TTL, CACHE_TTL_JITTER } from "@/lib/redis";

// Types for workspace cache
type WorkspaceCacheType = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
} | null;

type WorkspaceWithRoleCacheType = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  userRole: "owner" | "admin" | "member" | null;
} | null;

type WorkspacesListCacheType = WorkspaceWithRoleCacheType[] | null;

type WorkspaceLimitsCacheType = {
  maxClicksLimit: number;
  clicksTracked: number;
} | null;

type WorkspaceValidationCacheResult = {
  hasValue: boolean;
  workspace: WorkspaceCacheType;
};

// Type guards
function isWorkspaceCacheType(obj: unknown): obj is WorkspaceCacheType {
  if (!obj || typeof obj !== "object") return false;
  const workspace = obj as Record<string, unknown>;
  return (
    typeof workspace.id === "string" &&
    typeof workspace.name === "string" &&
    typeof workspace.slug === "string" &&
    "logo" in workspace
  );
}

function isWorkspaceWithRoleCacheType(
  obj: unknown,
): obj is WorkspaceWithRoleCacheType {
  if (!obj || typeof obj !== "object") return false;
  const workspace = obj as Record<string, unknown>;
  return (
    typeof workspace.id === "string" &&
    typeof workspace.name === "string" &&
    typeof workspace.slug === "string" &&
    "logo" in workspace &&
    (typeof workspace.userRole === "string" || workspace.userRole === null)
  );
}

function isWorkspacesListCacheType(
  obj: unknown,
): obj is WorkspacesListCacheType {
  return Array.isArray(obj) && obj.every(isWorkspaceWithRoleCacheType);
}

function isWorkspaceLimitsCacheType(
  obj: unknown,
): obj is WorkspaceLimitsCacheType {
  if (!obj || typeof obj !== "object") return false;
  const limits = obj as Record<string, unknown>;
  return (
    typeof limits.maxClicksLimit === "number" &&
    typeof limits.clicksTracked === "number"
  );
}

// Helper to parse cached data
function parseCachedData<T>(
  cached: unknown,
  validator: (obj: unknown) => obj is T,
): T | null {
  if (!cached) return null;

  // Fast path: if it's already parsed object
  if (typeof cached === "object" && cached !== null) {
    return validator(cached) ? cached : null;
  }

  // Parse if it's a string
  if (typeof cached === "string") {
    try {
      const parsed = JSON.parse(cached);
      return validator(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

// Get default workspace cache
export async function getDefaultWorkspaceCache(
  userId: string,
): Promise<WorkspaceCacheType> {
  try {
    const cached = await redis.get(`workspace:default:${userId}`);
    return parseCachedData(cached, isWorkspaceCacheType);
  } catch {
    return null;
  }
}

// Set default workspace cache
export async function setDefaultWorkspaceCache(
  userId: string,
  data: WorkspaceCacheType,
): Promise<void> {
  try {
    await redis.set(`workspace:default:${userId}`, JSON.stringify(data), {
      ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
    });
  } catch {}
}

// Get all workspaces cache
export async function getAllWorkspacesCache(
  userId: string,
): Promise<WorkspacesListCacheType> {
  try {
    const cached = await redis.get(`workspace:all:${userId}`);
    return parseCachedData(cached, isWorkspacesListCacheType);
  } catch {
    return null;
  }
}

// Set all workspaces cache
export async function setAllWorkspacesCache(
  userId: string,
  data: WorkspacesListCacheType,
): Promise<void> {
  try {
    await redis.set(`workspace:all:${userId}`, JSON.stringify(data), {
      ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
    });
  } catch {}
}

// Get workspace validation cache
export async function getWorkspaceValidationCache(
  userId: string,
  slug: string,
): Promise<WorkspaceValidationCacheResult> {
  try {
    const cached = await redis.get(`workspace:validate:${userId}:${slug}`);
    if (cached === null || cached === undefined) {
      return { hasValue: false, workspace: null };
    }

    if (cached === "null") {
      return { hasValue: true, workspace: null };
    }

    const parsed = parseCachedData(cached, isWorkspaceCacheType);
    if (parsed !== null) {
      return { hasValue: true, workspace: parsed };
    }

    return { hasValue: false, workspace: null };
  } catch {
    return { hasValue: false, workspace: null };
  }
}

// Set workspace validation cache
export async function setWorkspaceValidationCache(
  userId: string,
  slug: string,
  data: WorkspaceCacheType,
): Promise<void> {
  try {
    await redis.set(
      `workspace:validate:${userId}:${slug}`,
      JSON.stringify(data),
      {
        ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
      },
    );
  } catch {}
}

// Invalidate workspace caches
export async function invalidateWorkspaceCache(userId: string): Promise<void> {
  try {
    await Promise.all([
      redis.del(`workspace:default:${userId}`),
      redis.del(`workspace:all:${userId}`),
      invalidateAllValidationCaches(userId),
    ]);

    console.log(`Cache invalidated for user: ${userId}`);
  } catch (error) {
    console.error(
      `Failed to invalidate workspace cache for user ${userId}:`,
      error,
    );
  }
}

// Invalidate all validation caches for a user using pattern matching
async function invalidateAllValidationCaches(userId: string): Promise<void> {
  try {
    const keys = await redis.keys(`workspace:validate:${userId}:*`);

    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(
        `Cleared ${keys.length} validation cache keys for user ${userId}`,
      );
    }
  } catch (error) {
    console.error(
      `Failed to clear validation caches for user ${userId}:`,
      error,
    );
  }
}

// Invalidate specific workspace cache
export async function invalidateWorkspaceBySlug(
  userId: string,
  slug: string,
): Promise<void> {
  try {
    await redis.del(`workspace:validate:${userId}:${slug}`);
  } catch (error) {
    console.error(
      `Failed to invalidate workspace cache for ${userId}:${slug}:`,
      error,
    );
  }
}

// Get workspace limits cache
export async function getWorkspaceLimitsCache(
  workspaceId: string,
): Promise<WorkspaceLimitsCacheType> {
  try {
    const cached = await redis.get(`workspace:limits:${workspaceId}`);
    return parseCachedData(cached, isWorkspaceLimitsCacheType);
  } catch {
    return null;
  }
}

// Set workspace limits cache
export async function setWorkspaceLimitsCache(
  workspaceId: string,
  data: WorkspaceLimitsCacheType,
): Promise<void> {
  try {
    await redis.set(`workspace:limits:${workspaceId}`, JSON.stringify(data), {
      ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
    });
  } catch {}
}

// Invalidate workspace limits cache
export async function invalidateWorkspaceLimitsCache(
  workspaceId: string,
): Promise<void> {
  try {
    await redis.del(`workspace:limits:${workspaceId}`);
  } catch (error) {
    console.error(
      `Failed to invalidate workspace limits cache for ${workspaceId}:`,
      error,
    );
  }
}
