"use server";

import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";
import { checkWorkspaceLimit } from "@/server/actions/limit";
import { waitUntil } from "@vercel/functions";
import { calculateUsagePeriod } from "@/lib/usage-period";
import { revalidateTag, revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  getDefaultWorkspaceCache,
  setDefaultWorkspaceCache,
  getAllWorkspacesCache,
  setAllWorkspacesCache,
  getWorkspaceValidationCache,
  setWorkspaceValidationCache,
  invalidateWorkspaceCache,
} from "@/lib/cache-utils/workspace-cache";

// Revalidate all workspace-related cache tags
async function revalidateWorkspaceTags() {
  await Promise.all([
    revalidateTag("workspaces", "max"),
    revalidateTag("all-workspaces", "max"),
    revalidateTag("workspace", "max"),
    revalidateTag("workspace-validation", "max"),
  ]);
}

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

      return await tx.workspace.create({
        data: { userId, name, slug, logo, isDefault },
        select: { id: true, name: true, slug: true },
      });
    });

    // Revalidate caches
    await Promise.all([
      invalidateWorkspaceCache(userId),
      revalidateWorkspaceTags(),
    ]);
    revalidatePath(`/${workspace.slug}`);

    // Background tasks
    waitUntil(
      Promise.all([
        db.member.create({
          data: { userId, workspaceId: workspace.id, role: "owner" },
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
              addedUsers: 1,
              periodStart,
              periodEnd,
            },
          });
        })(),
      ]),
    );

    return { success: true, slug: workspace.slug };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Workspace slug already exists!",
        slugExists: true,
      };
    }

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
      where: { userId, isDefault: true },
      select: { id: true, name: true, slug: true, logo: true },
    });

    waitUntil(setDefaultWorkspaceCache(userId, workspace));

    return {
      success: !!workspace,
      workspace,
      fromCache: false,
    };
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
      return { success: true, workspaces: cachedWorkspaces };
    }

    const workspaces = await db.workspace.findMany({
      where: {
        OR: [{ userId }, { members: { some: { userId } } }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        userId: true,
        logo: true,
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const workspacesWithRoles = workspaces.map((workspace) => {
      const isOwner = workspace.userId === userId;
      const memberRole = workspace.members[0]?.role;

      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        logo: workspace.logo,
        userRole: isOwner ? "owner" : (memberRole ?? null),
      };
    });

    await setAllWorkspacesCache(userId, workspacesWithRoles);

    return { success: true, workspaces: workspacesWithRoles };
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return { success: false, workspaces: [] };
  }
}

export async function validateWorkspaceSlug(userId: string, slug: string) {
  try {
    const cachedWorkspaceResult = await getWorkspaceValidationCache(
      userId,
      slug,
    );
    if (cachedWorkspaceResult.hasValue) {
      return {
        success: !!cachedWorkspaceResult.workspace,
        workspace: cachedWorkspaceResult.workspace,
      };
    }

    // Try to find workspace where user is owner or member
    const workspace = await db.workspace.findFirst({
      where: {
        slug,
        OR: [{ userId }, { members: { some: { userId } } }],
      },
      select: { id: true, name: true, slug: true, logo: true },
    });

    await setWorkspaceValidationCache(userId, slug, workspace ?? null);

    return {
      success: !!workspace,
      workspace: workspace ?? null,
    };
  } catch (error) {
    console.error("Error validating workspace slug:", error);
    return { success: false, workspace: null };
  }
}
