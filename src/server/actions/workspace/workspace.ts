"use server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";
import { checkWorkspaceLimit } from "@/server/actions/limit";
import { waitUntil } from "@vercel/functions";
import { calculateUsagePeriod } from "@/lib/usage-period";
import { revalidateTag, revalidatePath } from "next/cache";
import {
  getDefaultWorkspaceCache,
  setDefaultWorkspaceCache,
  getAllWorkspacesCache,
  setAllWorkspacesCache,
  getWorkspaceValidationCache,
  setWorkspaceValidationCache,
  invalidateWorkspaceCache,
} from "@/lib/cache-utils/workspace-cache";

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
    const authResult = await getAuthSession();
    if (!authResult.success) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = authResult.session.user.id;

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

    await Promise.all([
      invalidateWorkspaceCache(userId),
      revalidateTag("workspaces", "max"),
      revalidateTag("all-workspaces", "max"),
      revalidateTag("workspace", "max"),
      revalidateTag("workspace-validation", "max"),
    ]);
    // Invalidate dashboard layout for new workspace so workspace switch shows after redirect
    revalidatePath(`/${workspace.slug}`);

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

export async function getDefaultWorkspace(userId: string) {
  try {
    const cachedWorkspace = await getDefaultWorkspaceCache(userId);
    if (cachedWorkspace) {
      return {
        success: true,
        workspace: cachedWorkspace,
        fromCache: true,
      };
    }

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
    });

    const cachePromise = setDefaultWorkspaceCache(userId, workspace);
    
    const result = {
      success: !!workspace,
      workspace,
      fromCache: false,
    };

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

export async function fetchAllWorkspaces(userId: string) {
  try {
    const cachedWorkspaces = await getAllWorkspacesCache(userId);
    if (cachedWorkspaces) {
      return {
        success: true,
        workspaces: cachedWorkspaces,
      };
    }

    const [ownedWorkspaces, memberWorkspaces] = await Promise.all([
      db.workspace.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          slug: true,
          userId: true,
          logo: true,
          createdAt: true,
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      db.workspace.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          userId: true,
          logo: true,
          createdAt: true,
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const workspaceMap = new Map<string, (typeof ownedWorkspaces)[0]>();
    
    ownedWorkspaces.forEach((ws) => workspaceMap.set(ws.id, ws));
    
    memberWorkspaces.forEach((ws) => {
      if (!workspaceMap.has(ws.id)) {
        workspaceMap.set(ws.id, ws);
      }
    });

    const workspaces = Array.from(workspaceMap.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

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

export async function validateWorkspaceSlug(userId: string, slug: string) {
  try {
    const cachedWorkspace = await getWorkspaceValidationCache(userId, slug);
    if (cachedWorkspace !== null) {
      return {
        success: !!cachedWorkspace,
        workspace: cachedWorkspace,
      };
    }

    let workspace = await db.workspace.findFirst({
      where: {
        slug,
        userId,
      },
      select: { id: true, name: true, slug: true, logo: true },
    });

    if (!workspace) {
      workspace = await db.workspace.findFirst({
        where: {
          slug,
          members: {
            some: {
              userId,
            },
          },
        },
        select: { id: true, name: true, slug: true, logo: true },
      });
    }

    if (!workspace) {
      await setWorkspaceValidationCache(userId, slug, null);
      return { success: false, workspace: null };
    }

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
