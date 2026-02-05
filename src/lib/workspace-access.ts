import { db } from "@/server/db";

export type WorkspaceRole = "owner" | "admin" | "member" | null;

export interface WorkspaceAccessResult {
  success: boolean;
  workspace: {
    id: string;
    name: string;
    slug: string;
  } | null;
  role: WorkspaceRole;
}

/**
 * Check if a user has access to a workspace and return their role
 * @param userId - The user ID
 * @param workspaceslug - The workspace slug
 * @returns WorkspaceAccessResult with success, workspace, and role
 */
export async function getWorkspaceAccess(
  userId: string,
  workspaceslug: string,
): Promise<WorkspaceAccessResult> {
  try {
    // First check if user is the owner
    const ownedWorkspace = await db.workspace.findFirst({
      where: {
        slug: workspaceslug,
        userId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (ownedWorkspace) {
      return {
        success: true,
        workspace: ownedWorkspace,
        role: "owner",
      };
    }

    // If not owner, check if user is a member
    const workspaceWithMember = await db.workspace.findFirst({
      where: {
        slug: workspaceslug,
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (workspaceWithMember && workspaceWithMember.members.length > 0) {
      const memberRole = workspaceWithMember.members[0]!.role;
      return {
        success: true,
        workspace: {
          id: workspaceWithMember.id,
          name: workspaceWithMember.name,
          slug: workspaceWithMember.slug,
        },
        role: memberRole === "admin" ? "admin" : "member",
      };
    }

    // No access
    return {
      success: false,
      workspace: null,
      role: null,
    };
  } catch (error) {
    console.error("Error checking workspace access:", error);
    return {
      success: false,
      workspace: null,
      role: null,
    };
  }
}

/**
 * Check if a user has a specific role or higher in a workspace
 * Role hierarchy: owner > admin > member
 */
export function hasRole(role: WorkspaceRole, requiredRole: "owner" | "admin" | "member"): boolean {
  if (!role) return false;
  if (requiredRole === "owner") return role === "owner";
  if (requiredRole === "admin") return role === "owner" || role === "admin";
  if (requiredRole === "member") return role === "owner" || role === "admin" || role === "member";
  return false;
}
