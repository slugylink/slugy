import { db } from "@/server/db";
import { getSubscriptionWithPlan } from "@/server/actions/subscription";

export function canUseLeadTracking(planType: string | null | undefined) {
  return planType?.toLowerCase() === "pro";
}

export async function getWorkspaceOwnerUserId(
  workspaceId: string,
): Promise<string | null> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { userId: true },
  });
  return workspace?.userId ?? null;
}

export async function getWorkspaceOwnerPlanType(
  workspaceId: string,
): Promise<string | null> {
  const ownerUserId = await getWorkspaceOwnerUserId(workspaceId);
  if (!ownerUserId) return null;

  const result = await getSubscriptionWithPlan(ownerUserId);
  return result.subscription?.plan?.planType ?? null;
}

export async function getWorkspaceOwnerPlanTypeBySlug(
  workspaceslug: string,
): Promise<string | null> {
  const workspace = await db.workspace.findFirst({
    where: { slug: workspaceslug, deletedAt: null },
    select: { userId: true },
  });
  if (!workspace?.userId) return null;

  const result = await getSubscriptionWithPlan(workspace.userId);
  return result.subscription?.plan?.planType ?? null;
}
