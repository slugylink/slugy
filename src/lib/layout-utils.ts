"use server";

import { redirect } from "next/navigation";
import { unstable_cache, revalidateTag } from "next/cache";
import { getAuthSession } from "@/lib/auth";
import { fetchAllWorkspaces, validateWorkspaceSlug } from "@/server/actions/workspace/workspace";

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
    return await validateWorkspaceSlug(userId, slug);
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

  // If no workspace slug provided (for "others" layout), only fetch workspaces
  if (!workspaceSlug) {
    let workspaces;
    try {
      workspaces = await getCachedWorkspaces(userId);
    } catch (error) {
      console.error("Error fetching cached workspaces, falling back to direct fetch:", error);
      const result = await fetchAllWorkspaces(userId);
      workspaces = result.success ? result.workspaces : [];
    }

    const defaultSlug = workspaces.length > 0 && workspaces[0] ? workspaces[0].slug : "";
    return {
      workspaces,
      workspaceslug: defaultSlug,
      session,
    };
  }

  // For dashboard layout: fetch workspaces and validate workspace slug in parallel
  // This reduces total time from sequential (workspaces + validation) to max(workspaces, validation)
  const [workspacesResult, validationResult] = await Promise.all([
    // Fetch all workspaces with caching
    (async () => {
      try {
        return await getCachedWorkspaces(userId);
      } catch (error) {
        console.error("Error fetching cached workspaces, falling back to direct fetch:", error);
        const result = await fetchAllWorkspaces(userId);
        return result.success ? result.workspaces : [];
      }
    })(),
    // Validate workspace slug in parallel
    getCachedWorkspaceValidation(userId, workspaceSlug),
  ]);

  const workspaces = workspacesResult;
  const validation = validationResult;

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
