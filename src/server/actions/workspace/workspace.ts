"use server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { checkWorkspaceLimit } from "@/server/actions/limit";
import { waitUntil } from "@vercel/functions";
import { calculateUsagePeriod } from "@/lib/usage-period";
import {
  getDefaultWorkspaceCache,
  setDefaultWorkspaceCache,
  getAllWorkspacesCache,
  setAllWorkspacesCache,
  getWorkspaceValidationCache,
  setWorkspaceValidationCache,
  invalidateWorkspaceCache,
} from "@/lib/cache-utils/workspace-cache";

//* Server action to create a workspace
export async function createWorkspace({
  name,
  slug,
  logo,
  isDefault = false,
}: {
  name: string;
  slug: string;
  logo?: string;
  isDefault?: boolean;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Check if workspace slug already exists
    const existingWorkspace = await db.workspace.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (existingWorkspace) {
      return {
        success: false,
        error: "Workspace slug already exists!",
        slugExists: true,
      };
    }

    // Check workspace limits before creating
    const limitCheck = await checkWorkspaceLimit(userId);

    if (!limitCheck.canCreate) {
      return {
        success: false,
        error: limitCheck.message,
        limitInfo: {
          currentCount: limitCheck.currentCount,
          maxLimit: limitCheck.maxLimit,
          planType: limitCheck.planType,
        },
      };
    }

    const workspace = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.workspace.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const workspace = await tx.workspace.create({
        data: {
          userId,
          name,
          slug,
          logo,
          isDefault,
        },
      });

      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      };
    });

    waitUntil(
      Promise.all([
        db.member.create({
          data: {
            userId,
            workspaceId: workspace.id,
            role: "owner",
          },
        }),
        (async () => {
          const { periodStart, periodEnd } = calculateUsagePeriod(
            null,
            new Date(),
          );
          await db.usage.create({
            data: {
              userId,
              workspaceId: workspace.id,
              linksCreated: 0,
              clicksTracked: 0,
              addedUsers: 1, // Start with 1 user (the creator)
              periodStart,
              periodEnd,
            },
          });
        })(),
        // Invalidate workspace caches after creation
        invalidateWorkspaceCache(userId),
      ]),
    );

    return { success: true, slug: workspace.slug };
  } catch (error) {
    console.error("Error creating workspace:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

//* Get current default workspace with more details - OPTIMIZED FOR SPEED
export async function getDefaultWorkspace(userId: string) {
  try {
    // Try to get from cache first (fastest path)
    const cachedWorkspace = await getDefaultWorkspaceCache(userId);
    if (cachedWorkspace) {
      return {
        success: true,
        workspace: cachedWorkspace,
        fromCache: true,
      };
    }

    // Cache miss: fetch from database with optimized query
    const workspace = await db.workspace.findFirst({
      where: { 
        userId, 
        isDefault: true 
      },
      select: { 
        id: true, 
        name: true, 
        slug: true, 
        logo: true 
      },
      // Remove orderBy for speed - just get the first default workspace
    });

    // Cache the result immediately (including null results)
    const cachePromise = setDefaultWorkspaceCache(userId, workspace);
    
    // Return response immediately, don't wait for cache to be set
    const result = {
      success: !!workspace,
      workspace,
      fromCache: false,
    };

    // Set cache in background (non-blocking)
    waitUntil(cachePromise);

    return result;
  } catch (error) {
    console.error("Error getting default workspace:", error);
    return {
      success: false,
      workspace: null,
      fromCache: false,
    };
  }
}

//* fetch all workspaces
export async function fetchAllWorkspaces(userId: string) {
  try {
    // Try to get from cache first
    const cachedWorkspaces = await getAllWorkspacesCache(userId);
    if (cachedWorkspaces) {
      return {
        success: true,
        workspaces: cachedWorkspaces,
      };
    }

    // Cache miss: fetch from database
    const workspaces = await db.workspace.findMany({
      where: {
        OR: [
          { userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        userId: true,
        logo: true,
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const workspacesWithRoles = workspaces.map((workspace) => {
      const isOwner = workspace.userId === userId;
      const memberRole = workspace.members.find(
        (m) => m.userId === userId,
      )?.role;

      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        logo: workspace.logo,
        userRole: isOwner ? "owner" : (memberRole ?? null),
      };
    });

    // Cache the result
    await setAllWorkspacesCache(userId, workspacesWithRoles);

    return {
      success: true,
      workspaces: workspacesWithRoles,
    };
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return {
      success: false,
      workspaces: [],
    };
  }
}

//* validate workspace slug
export async function validateworkspaceslug(userId: string, slug: string) {
  try {
    // Try to get from cache first
    const cachedWorkspace = await getWorkspaceValidationCache(userId, slug);
    if (cachedWorkspace !== null) {
      return {
        success: !!cachedWorkspace,
        workspace: cachedWorkspace,
      };
    }

    // Cache miss: fetch from database
    const workspace = await db.workspace.findUnique({
      where: {
        slug: slug,
        OR: [
          { userId: userId },
          {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      select: { id: true, name: true, slug: true, logo: true },
    });

    if (!workspace) {
      // Cache null result to avoid repeated DB queries
      await setWorkspaceValidationCache(userId, slug, null);
      return { success: false, workspace: null };
    }

    // Cache the result
    await setWorkspaceValidationCache(userId, slug, workspace);

    return {
      success: true,
      workspace,
    };
  } catch (error) {
    console.error("Error validating workspace slug:", error);
    return {
      success: false,
      workspace: null,
    };
  }
}
