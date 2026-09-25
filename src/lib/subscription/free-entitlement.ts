import { db } from "@/server/db";
import { syncUserLimits } from "@/lib/subscription/limits-sync";

/**
 * Idempotent Free ($0) entitlement. Creates the subscription row on first
 * call (signup, onboarding, or any limit check) and tops up limits.
 * Never touches an existing active/trialing paid subscription.
 */
export async function ensureFreeSubscription(userId: string) {
  const existing = await db.subscription.findUnique({
    where: { referenceId: userId },
    select: {
      id: true,
      status: true,
      plan: { select: { planType: true } },
    },
  });

  const status = existing?.status?.toLowerCase() ?? "";
  if (
    existing &&
    ["active", "trialing"].includes(status) &&
    existing.plan.planType !== "free"
  ) {
    return { success: true as const, created: false };
  }

  const freePlan = await db.plan.findFirst({
    where: { planType: "free" },
    select: { id: true },
  });
  if (!freePlan) {
    console.error("[Free Entitlement] Free plan row missing from DB");
    return { success: false as const, created: false };
  }

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 100);

  await db.subscription.upsert({
    where: { referenceId: userId },
    create: {
      referenceId: userId,
      planId: freePlan.id,
      status: "active",
      provider: "internal",
      periodStart,
      periodEnd,
      billingInterval: "month",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      subscriptionId: null,
    },
    update: {
      planId: freePlan.id,
      status: "active",
      provider: "internal",
      periodStart,
      periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      subscriptionId: null,
    },
  });

  await syncUserLimits(userId, "free");
  return { success: true as const, created: true };
}
