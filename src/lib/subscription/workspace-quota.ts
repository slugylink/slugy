import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { FREE_PLAN, toPlanSeed } from "@/constants/data/price";
import { getSubscriptionWithPlan } from "@/lib/subscription/queries";
import { hasInvalidRecurringPeriod, isLifetimePlan } from "./billing-period";

export class WorkspaceQuotaError extends Error {}

/** Call only after workspace authorization. All quota writers share this row lock. */
export async function withWorkspaceQuota<T>(
  workspaceId: string,
  write: (
    tx: Prisma.TransactionClient,
    plan: Pick<
      ReturnType<typeof toPlanSeed>,
      "maxUsers" | "maxCustomDomains" | "maxTagsPerWorkspace"
    >,
  ) => Promise<T>,
): Promise<T> {
  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, deletedAt: null },
    select: { userId: true },
  });
  if (!workspace) throw new WorkspaceQuotaError("Workspace not found");
  // Provider calls must finish before taking a database lock.
  await getSubscriptionWithPlan(workspace.userId);
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      Array<{ userId: string }>
    >`SELECT "userId" FROM workspaces WHERE id = ${workspaceId} AND "deletedAt" IS NULL FOR UPDATE`;
    if (!locked[0]) throw new WorkspaceQuotaError("Workspace not found");
    const subscription = await tx.subscription.findUnique({
      where: { referenceId: locked[0].userId },
      include: { plan: true },
    });
    const active =
      subscription &&
      ["active", "trialing"].includes(subscription.status) &&
      !hasInvalidRecurringPeriod(
        subscription.plan.planType,
        subscription.periodStart,
        subscription.periodEnd,
      ) &&
      (isLifetimePlan(subscription.plan.planType) ||
        subscription.periodEnd > new Date());
    const plan = active ? subscription.plan : toPlanSeed(FREE_PLAN);
    return write(tx, plan);
  });
}

export async function assertSeatAvailable(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  maxUsers: number,
  includePending: boolean,
) {
  const members = await tx.member.count({ where: { workspaceId } });
  const pending = includePending
    ? await tx.invitation.count({
        where: {
          workspaceId,
          status: "pending",
          deletedAt: null,
          expiresAt: { gt: new Date() },
        },
      })
    : 0;
  if (members + pending >= maxUsers)
    throw new WorkspaceQuotaError("Team member limit reached for this plan.");
}
