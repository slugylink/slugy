"use server";

import { redirect } from "next/navigation";
import { unstable_cache, revalidateTag } from "next/cache";
import { getAuthSession } from "@/lib/auth";
import { fetchAllWorkspaces, validateworkspaceslug } from "@/server/actions/workspace/workspace";

// Cached workspace data with proper revalidation
const getCachedWorkspaces = unstable_cache(
  async (userId: string) => {
    const result = await fetchAllWorkspaces(userId);
    return result.success ? result.workspaces : [];
  },
  ["workspaces"],
  {
    revalidate: 300, // 5 minutes
    tags: ["workspaces", "all-workspaces"],
  },
);

// Cached workspace validation
const getCachedWorkspaceValidation = unstable_cache(
  async (userId: string, slug: string) => {
    return await validateworkspaceslug(userId, slug);
  },
  ["workspace-validation"],
  {
    revalidate: 60, // 1 minute
    tags: ["workspace-validation", "workspace"],
  },
);

// Optimized layout data fetching with error handling
export async function getLayoutData(workspaceSlug?: string) {
  // Get authenticated session
  const authResult = await getAuthSession();
  if (!authResult.success) {
    redirect(authResult.redirectTo);
  }

  const { session } = authResult;
  const userId = session.user.id;

  // Fetch all workspaces with caching
  // Note: This uses unstable_cache which should be invalidated by revalidateTag
  let workspaces;
  try {
    workspaces = await getCachedWorkspaces(userId);
  } catch (error) {
    console.error("Error fetching cached workspaces, falling back to direct fetch:", error);
    // Fallback to direct fetch if cache fails
    const result = await fetchAllWorkspaces(userId);
    workspaces = result.success ? result.workspaces : [];
  }

  // If no workspace slug provided (for "others" layout), use first available workspace
  if (!workspaceSlug) {
    const defaultSlug = workspaces.length > 0 && workspaces[0] ? workspaces[0].slug : "";
    return {
      workspaces,
      workspaceslug: defaultSlug,
      session,
    };
  }

  // Validate workspace slug for dashboard layout
  const validation = await getCachedWorkspaceValidation(userId, workspaceSlug);

  if (!validation.success) {
    // Return not found state instead of throwing - let component handle it
    return {
      workspaces,
      workspaceslug: workspaceSlug,
      session,
      workspaceNotFound: true,
    };
  }

  return {
    workspaces,
    workspaceslug: workspaceSlug,
    session,
    workspaceNotFound: false,
  };
}


// Revalidation utility for workspace changes
export async function revalidateWorkspaceData(userId?: string, path: string = "max") {
  try {
    // Revalidate Next.js cache tags
    // Use "max" as default path parameter to avoid cacheLife configuration requirement
    await Promise.all([
      revalidateTag("workspaces", path),
      revalidateTag("all-workspaces", path),
      revalidateTag("workspace", path),
      revalidateTag("workspace-validation", path),
    ]);
    
    // If userId provided, also invalidate Redis caches
    if (userId) {
      const { invalidateWorkspaceCache } = await import("@/lib/cache-utils/workspace-cache");
      await invalidateWorkspaceCache(userId);
    }
    
    console.log("Workspace data revalidated successfully");
  } catch (error) {
    console.error("Failed to revalidate workspace data:", error);
  }
}
