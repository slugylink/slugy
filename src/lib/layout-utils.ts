"use server";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
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
    tags: ["workspaces"],
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
    tags: ["workspace-validation"],
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
  const workspaces = await getCachedWorkspaces(userId);

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
export async function revalidateWorkspaceData() {
  // This would trigger revalidation of cached data
  // Implementation depends on your cache invalidation strategy
}
