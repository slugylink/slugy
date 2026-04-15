import { db } from "@/server/db";
import { syncUserLimits } from "@/lib/subscription/limits-sync";

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

  const basicPlan = await db.plan.findFirst({
    where: { planType: "basic" },
    select: { id: true, monthlyPriceId: true, planType: true },
  });

  if (!basicPlan?.id) return null;

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 100);

  const priceId = input.priceId ?? basicPlan.monthlyPriceId ?? undefined;

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
    },
    select: activeSubscriptionSelect,
  });

  await db.user.update({
    where: { id: input.userId },
    data: { customerId },
  });

  await syncUserLimits(input.userId, basicPlan.planType);
  return subscription;
}
