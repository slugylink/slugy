"use server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { checkWorkspaceLimit } from "@/server/actions/limit";
import { waitUntil } from "@vercel/functions";

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
      // If this workspace is being set as default, remove default from all other workspaces
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

    // Create member and usage record as background tasks
    waitUntil(
      Promise.all([
        db.member.create({
          data: {
            userId,
            workspaceId: workspace.id,
            role: "owner",
          },
        }),
        db.usage.create({
          data: {
            userId,
            workspaceId: workspace.id,
            linksCreated: 0,
            clicksTracked: 0,
            addedUsers: 1, // Start with 1 user (the creator)
            periodStart: new Date(),
            periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Set period end to next month
          },
        }),
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

//* Get current default workspace with more details
export async function getDefaultWorkspace(userId: string) {
  try {
    const workspace = await db.workspace.findFirst({
      where: { userId, isDefault: true },
      select: { id: true, name: true, slug: true, logo: true },
    });

    if (!workspace) {
      return {
        success: false,
        workspace: null,
      };
    }

    return {
      success: true,
      workspace,
    };
  } catch (error) {
    console.error("Error getting default workspace:", error);
    return {
      success: false,
      workspace: null,
    };
  }
}

//* fetch all workspaces
export async function fetchAllWorkspaces(userId: string) {
  try {
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
      select: { id: true, name: true, slug: true },
    });
    if (!workspace) return { success: false, workspace: null };
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
