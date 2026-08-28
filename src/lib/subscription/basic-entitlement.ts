import { db } from "@/server/db";
import { syncUserLimits } from "@/lib/subscription/limits-sync";
import { isLifetimeBillingPeriod } from "@/lib/subscription/reconcile";

export const activeSubscriptionSelect = {
  id: true,
  priceId: true,
  customerId: true,
  provider: true,
  status: true,
  periodStart: true,
  periodEnd: true,
  cancelAtPeriodEnd: true,
  canceledAt: true,
  plan: {
    select: {
      id: true,
      name: true,
      planType: true,
    },
  },
};

/**
 * Activates Basic entitlement for a verified paid Basic checkout/order.
 * Refuses to overwrite an in-period active/trialing Pro subscription.
 */
export async function activateBasicEntitlement(input: {
  userId: string;
  customerId?: string | null;
  priceId?: string | null;
}) {
  const customerId =
    input.customerId ??
    (
      await db.user.findUnique({
        where: { id: input.userId },
        select: { customerId: true },
      })
    )?.customerId;

  if (!customerId) return null;

  const existing = await db.subscription.findUnique({
    where: { referenceId: input.userId },
    select: {
      id: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      plan: { select: { planType: true } },
    },
  });

  const status = existing?.status?.toLowerCase() ?? "";
  const isActivePro =
    existing?.plan.planType === "pro" &&
    ["active", "trialing"].includes(status) &&
    (existing.periodEnd > new Date() ||
      isLifetimeBillingPeriod("pro", existing.periodStart, existing.periodEnd));

  if (isActivePro) {
    console.warn(
      `[Basic Entitlement] Refusing to overwrite active Pro for user ${input.userId}`,
    );
    return db.subscription.findUnique({
      where: { referenceId: input.userId },
      select: activeSubscriptionSelect,
    });
  }

  const basicPlan = await db.plan.findFirst({
    where: { planType: "basic" },
    select: { id: true, monthlyPriceId: true, planType: true },
  });

  if (!basicPlan?.id) return null;

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 100);

  const priceId = input.priceId ?? basicPlan.monthlyPriceId ?? undefined;
  const now = new Date();

  const subscription = await db.subscription.upsert({
    where: { referenceId: input.userId },
    create: {
      referenceId: input.userId,
      planId: basicPlan.id,
      customerId,
      priceId,
      status: "active",
      provider: "polar",
      periodStart,
      periodEnd,
      billingInterval: "month",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      subscriptionId: null,
    },
    update: {
      planId: basicPlan.id,
      customerId,
      priceId,
      status: "active",
      provider: "polar",
      periodStart,
      periodEnd,
      billingInterval: "month",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      subscriptionId: null,
    },
    select: activeSubscriptionSelect,
  });

  await db.user.update({
    where: { id: input.userId },
    data: { customerId, lifetimeBasicAt: now },
  });

  await syncUserLimits(input.userId, basicPlan.planType);
  return subscription;
}

/**
 * Ends paid Pro access. Restores active Basic when the user previously
 * purchased lifetime Basic; otherwise marks the subscription inactive.
 */
export async function downgradeToBasicLimits(input: {
  subscriptionId: string;
  canceledAt?: Date;
}) {
  const basicPlan = await db.plan.findFirst({
    where: { planType: "basic" },
    select: { id: true, monthlyPriceId: true, planType: true },
  });

  const existing = await db.subscription.findUnique({
    where: { id: input.subscriptionId },
    select: {
      referenceId: true,
      customerId: true,
      priceId: true,
    },
  });

  if (!existing) return false;

  const user = await db.user.findUnique({
    where: { id: existing.referenceId },
    select: { lifetimeBasicAt: true, customerId: true },
  });

  if (user?.lifetimeBasicAt) {
    await activateBasicEntitlement({
      userId: existing.referenceId,
      customerId: existing.customerId ?? user.customerId,
      priceId: existing.priceId,
    });
    return true;
  }

  await db.subscription.update({
    where: { id: input.subscriptionId },
    data: {
      status: "inactive",
      canceledAt: input.canceledAt ?? new Date(),
      cancelAtPeriodEnd: false,
      ...(basicPlan
        ? {
            planId: basicPlan.id,
            priceId: basicPlan.monthlyPriceId ?? null,
            subscriptionId: null,
          }
        : {}),
    },
  });

  await syncUserLimits(existing.referenceId, "basic");
  return true;
}
