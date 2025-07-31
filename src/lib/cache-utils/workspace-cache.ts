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

// Type guards
function isWorkspaceCacheType(obj: unknown): obj is WorkspaceCacheType {
  return (
    !!obj &&
    typeof obj === "object" &&
    typeof (obj as { id?: unknown }).id === "string" &&
    typeof (obj as { name?: unknown }).name === "string" &&
    typeof (obj as { slug?: unknown }).slug === "string" &&
    ("logo" in obj)
  );
}

function isWorkspaceWithRoleCacheType(obj: unknown): obj is WorkspaceWithRoleCacheType {
  return (
    !!obj &&
    typeof obj === "object" &&
    typeof (obj as { id?: unknown }).id === "string" &&
    typeof (obj as { name?: unknown }).name === "string" &&
    typeof (obj as { slug?: unknown }).slug === "string" &&
    ("logo" in obj) &&
    typeof (obj as { userRole?: unknown }).userRole === "string"
  );
}

function isWorkspacesListCacheType(obj: unknown): obj is WorkspacesListCacheType {
  return Array.isArray(obj) && obj.every(isWorkspaceWithRoleCacheType);
}

// Get default workspace cache
export async function getDefaultWorkspaceCache(userId: string): Promise<WorkspaceCacheType> {
  const cacheKey = `workspace:default:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    const parsed = cached
      ? typeof cached === "string"
        ? JSON.parse(cached)
        : cached
      : null;
      console.log("fetched default workspace ✨");
    if (isWorkspaceCacheType(parsed)) return parsed;
  } catch {}
  return null;
}

// Set default workspace cache
export async function setDefaultWorkspaceCache(
  userId: string,
  data: WorkspaceCacheType,
): Promise<void> {
  const cacheKey = `workspace:default:${userId}`;
  try {
    await redis.set(cacheKey, JSON.stringify(data), {
      ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
    });
  } catch {}
}

// Get all workspaces cache
export async function getAllWorkspacesCache(userId: string): Promise<WorkspacesListCacheType> {
  const cacheKey = `workspace:all:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    const parsed = cached
      ? typeof cached === "string"
        ? JSON.parse(cached)
        : cached
      : null;
      console.log("fetched all workspaces ✨");
    if (isWorkspacesListCacheType(parsed)) return parsed;
  } catch {}
  return null;
}

// Set all workspaces cache
export async function setAllWorkspacesCache(
  userId: string,
  data: WorkspacesListCacheType,
): Promise<void> {
  const cacheKey = `workspace:all:${userId}`;
  try {
    await redis.set(cacheKey, JSON.stringify(data), {
      ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
    });
  } catch {}
}

// Get workspace validation cache
export async function getWorkspaceValidationCache(
  userId: string,
  slug: string,
): Promise<WorkspaceCacheType> {
  const cacheKey = `workspace:validate:${userId}:${slug}`;
  try {
    const cached = await redis.get(cacheKey);
    const parsed = cached
      ? typeof cached === "string"
        ? JSON.parse(cached)
        : cached
      : null;
    if (isWorkspaceCacheType(parsed)) return parsed;
  } catch {}
  return null;
}

// Set workspace validation cache
export async function setWorkspaceValidationCache(
  userId: string,
  slug: string,
  data: WorkspaceCacheType,
): Promise<void> {
  const cacheKey = `workspace:validate:${userId}:${slug}`;
  try {
    await redis.set(cacheKey, JSON.stringify(data), {
      ex: CACHE_BASE_TTL + CACHE_TTL_JITTER,
    });
  } catch {}
}

// Invalidate workspace caches
export async function invalidateWorkspaceCache(userId: string): Promise<void> {
  try {
    // Delete specific keys
    await Promise.all([
      redis.del(`workspace:default:${userId}`),
      redis.del(`workspace:all:${userId}`),
    ]);
    
    // Note: For validation cache pattern matching, we'd need to use SCAN
    // This is a simplified approach - in production you might want to use SCAN
    console.log(`Cache invalidated for user: ${userId}`);
  } catch (error) {
    console.error(`Failed to invalidate workspace cache for user ${userId}:`, error);
  }
}

// Invalidate specific workspace cache
export async function invalidateWorkspaceBySlug(userId: string, slug: string): Promise<void> {
  const cacheKey = `workspace:validate:${userId}:${slug}`;
  try {
    await redis.del(cacheKey);
  } catch (error) {
    console.error(`Failed to invalidate workspace cache for ${userId}:${slug}:`, error);
  }
}
