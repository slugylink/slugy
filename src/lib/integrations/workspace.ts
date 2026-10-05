import { db } from "@/server/db";
import type { WorkspaceRole } from "@prisma/client";

export async function getWorkspaceBySlugForMember(
  slug: string,
  userId: string,
) {
  return db.workspace.findFirst({
    where: {
      slug,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: { id: true, slug: true, userId: true },
  });
}

export async function requireWorkspaceManager(slug: string, userId: string) {
  const workspace = await db.workspace.findFirst({
    where: {
      slug,
      deletedAt: null,
      OR: [
        { userId },
        { members: { some: { userId, role: { in: ["owner", "admin"] } } } },
      ],
    },
    select: { id: true, slug: true, userId: true },
  });
  return workspace;
}

export type IntegrationsActorRole = "owner" | "admin" | "member";

/** Owner = workspace creator or a member row with the owner role. */
export async function getWorkspaceActorRole(
  slug: string,
  userId: string,
): Promise<{ id: string; slug: string; role: IntegrationsActorRole } | null> {
  const workspace = await db.workspace.findFirst({
    where: {
      slug,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      slug: true,
      userId: true,
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!workspace) return null;
  if (workspace.userId === userId) {
    return { id: workspace.id, slug: workspace.slug, role: "owner" };
  }
  const role = workspace.members[0]?.role as WorkspaceRole | undefined;
  if (role === "owner")
    return { id: workspace.id, slug: workspace.slug, role: "owner" };
  if (role === "admin")
    return { id: workspace.id, slug: workspace.slug, role: "admin" };
  return { id: workspace.id, slug: workspace.slug, role: "member" };
}

export async function requireWorkspaceOwner(slug: string, userId: string) {
  const actor = await getWorkspaceActorRole(slug, userId);
  if (!actor || actor.role !== "owner") return null;
  return actor;
}

/**
 * Integrations gate. Members may manage integrations by default (they can
 * already create links and view lead analytics); when the workspace flips
 * `integrationsManagerOnly`, only owners/admins pass.
 */
export async function requireIntegrationsAccess(slug: string, userId: string) {
  const workspace = await db.workspace.findFirst({
    where: {
      slug,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      slug: true,
      userId: true,
      integrationsManagerOnly: true,
      members: { where: { userId }, select: { role: true }, take: 1 },
    },
  });
  if (!workspace) return null;
  if (!workspace.integrationsManagerOnly) {
    return { id: workspace.id, slug: workspace.slug };
  }
  if (workspace.userId === userId) {
    return { id: workspace.id, slug: workspace.slug };
  }
  const role = workspace.members[0]?.role;
  if (role === "owner" || role === "admin") {
    return { id: workspace.id, slug: workspace.slug };
  }
  return null;
}
