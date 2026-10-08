"use server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";
import { requireSelf } from "@/lib/require-self";
import * as queries from "@/lib/subscription/limit-queries";
export async function checkWorkspaceAccessAndLimits(
  userId: string,
  workspaceslug: string,
) {
  await requireSelf(userId);
  return queries.checkWorkspaceAccessAndLimits(userId, workspaceslug);
}
export async function checkWorkspaceLimit(userId: string) {
  await requireSelf(userId);
  return queries.checkWorkspaceLimit(userId);
}
export async function getUserWorkspaceStats(userId: string) {
  await requireSelf(userId);
  return queries.getUserWorkspaceStats(userId);
}
export async function checkLinkLimit(userId: string, workspaceId: string) {
  await requireSelf(userId);
  const workspace = await db.workspace.findFirst({
    where: {
      id: workspaceId,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
  });
  if (!workspace) throw new Error("Unauthorized");
  return queries.checkLinkLimit(userId, workspaceId);
}
export async function checkBioGalleryLimit(userId: string) {
  await requireSelf(userId);
  return queries.checkBioGalleryLimit(userId);
}
export async function checkBioGalleryLinkLimit(userId: string, bioId: string) {
  await requireSelf(userId);
  const bio = await db.bio.findFirst({ where: { id: bioId, userId } });
  if (!bio) throw new Error("Unauthorized");
  return queries.checkBioGalleryLinkLimit(userId, bioId);
}
export async function checkDomainLimit(
  workspaceId: string,
  maxDomains: number,
) {
  const auth = await getAuthSession();
  if (!auth.success) throw new Error("Unauthorized");
  const workspace = await db.workspace.findFirst({
    where: {
      id: workspaceId,
      deletedAt: null,
      OR: [
        { userId: auth.session.user.id },
        { members: { some: { userId: auth.session.user.id } } },
      ],
    },
  });
  if (!workspace) throw new Error("Unauthorized");
  return queries.checkDomainLimit(workspaceId, maxDomains);
}
