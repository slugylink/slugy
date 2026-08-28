import { db } from "@/server/db";
import { getActiveSubscription } from "@/server/actions/subscription";

export function canUseLeadTracking(planType: string | null | undefined) {
  return planType?.toLowerCase() === "pro";
}

export async function getWorkspaceOwnerPlanType(workspaceId: string) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { userId: true },
  });
  if (!workspace?.userId) return null;

  const result = await getActiveSubscription(workspace.userId);
  return result.subscription?.plan?.planType ?? null;
}
