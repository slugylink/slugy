"use server";

import { redirect } from "next/navigation";
import { unstable_cache, revalidateTag } from "next/cache";
import { getAuthSession } from "@/lib/auth";
import {
  fetchAllWorkspaces,
  validateWorkspaceSlug,
} from "@/server/actions/workspace/workspace";

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
  async (userId: string, slug: string) => validateWorkspaceSlug(userId, slug),
  ["workspace-validation"],
  {
    revalidate: 60, // 1 minute
    tags: ["workspace-validation", "workspace"],
  },
);

// Helper to fetch workspaces with fallback
async function fetchWorkspacesWithFallback(userId: string) {
  try {
    return await getCachedWorkspaces(userId);
  } catch (error) {
    console.error(
      "Error fetching cached workspaces, falling back to direct fetch:",
      error,
    );
    const result = await fetchAllWorkspaces(userId);
    return result.success ? result.workspaces : [];
  }
}

// Optimized layout data fetching with error handling
export async function getLayoutData(workspaceSlug?: string) {
  const authResult = await getAuthSession();
  if (!authResult.success) {
    redirect(authResult.redirectTo);
  }

  const userId = authResult.session.user.id;

  // If no workspace slug provided (for "others" layout), only fetch workspaces
  if (!workspaceSlug) {
    const workspaces = await fetchWorkspacesWithFallback(userId);
    const defaultSlug = workspaces[0]?.slug ?? "";

    return {
      workspaces,
      workspaceslug: defaultSlug,
      session: authResult.session,
    };
  }

  // For dashboard layout: fetch workspaces and validate workspace slug in parallel
  const [workspaces, validation] = await Promise.all([
    fetchWorkspacesWithFallback(userId),
    getCachedWorkspaceValidation(userId, workspaceSlug),
  ]);

  return {
    workspaces,
    workspaceslug: workspaceSlug,
    session: authResult.session,
    workspaceNotFound: !validation.success,
  };
}

// Revalidation utility for workspace changes
export async function revalidateWorkspaceData(userId?: string) {
  try {
    // Revalidate Next.js cache tags
    await Promise.all([
      revalidateTag("workspaces", "max"),
      revalidateTag("all-workspaces", "max"),
      revalidateTag("workspace", "max"),
      revalidateTag("workspace-validation", "max"),
    ]);

    // If userId provided, also invalidate Redis caches
    if (userId) {
      const { invalidateWorkspaceCache } = await import(
        "@/lib/cache-utils/workspace-cache"
      );
      await invalidateWorkspaceCache(userId);
    }

    console.log("Workspace data revalidated successfully");
  } catch (error) {
    console.error("Failed to revalidate workspace data:", error);
  }
}
