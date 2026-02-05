import { Webhooks } from "@polar-sh/nextjs";
import { db } from "@/server/db";
import { syncUserLimits, revalidateSubscriptionCache } from "@/lib/subscription/limits-sync";
import { polarClient } from "@/lib/polar";

const LOG_PREFIX = "[Polar]";

type PolarSubscription = {
  id?: string;
  status?: string;
  metadata?: { userId?: string };
  user_metadata?: { userId?: string };
  customer?: { id?: string; externalId?: string };
  customerId?: string;
  customer_id?: string;
  priceId?: string;
  prices?: { id?: string }[];
  product?: { name?: string; prices?: { id?: string }[] };
  currentPeriodStart?: string;
  current_period_start?: string;
  currentPeriodEnd?: string;
  current_period_end?: string;
  recurringInterval?: string;
  recurring_interval?: string;
  cancelAtPeriodEnd?: boolean;
  cancel_at_period_end?: boolean;
  canceledAt?: string;
  canceled_at?: string;
};

function getPriceId(sub: PolarSubscription): string | null {
  const id =
    sub.prices?.[0]?.id ??
    sub.product?.prices?.[0]?.id ??
    sub.priceId ??
    null;
  return id ?? null;
}

function matchesPriceId(plan: { monthlyPriceId: string | null; yearlyPriceId: string | null }, priceId: string): boolean {
  const p = priceId.trim();
  return plan.monthlyPriceId?.trim() === p || plan.yearlyPriceId?.trim() === p;
}

async function findPlanByPriceId(priceId: string) {
  let plan = await db.plan.findFirst({
    where: { OR: [{ monthlyPriceId: priceId }, { yearlyPriceId: priceId }] },
  });
  if (plan) return plan;
  const plans = await db.plan.findMany({
    where: {
      OR: [
        { monthlyPriceId: { not: null } },
        { yearlyPriceId: { not: null } },
      ],
    },
  });
  return plans.find((p) => matchesPriceId(p, priceId)) ?? null;
}

async function syncProPlanPriceIdsFromPolar(): Promise<void> {
  try {
    const response = await polarClient.products.list({ isArchived: false });
    const items = response?.result?.items ?? [];
    let monthlyPriceId: string | null = null;
    let yearlyPriceId: string | null = null;
    for (const product of items) {
      for (const price of product.prices ?? []) {
        const raw = price as { id?: string; recurring_interval?: string; recurringInterval?: string };
        const id = raw.id ?? "";
        const interval = (raw.recurringInterval ?? raw.recurring_interval ?? "") as string;
        if (!id) continue;
        if (interval === "month") monthlyPriceId = id;
        if (interval === "year") yearlyPriceId = id;
      }
    }
    if (!monthlyPriceId && !yearlyPriceId) return;
    const pro = await db.plan.findFirst({ where: { planType: "pro" } });
    if (!pro) return;
    await db.plan.update({
      where: { id: pro.id },
      data: {
        ...(monthlyPriceId && { monthlyPriceId }),
        ...(yearlyPriceId && { yearlyPriceId }),
      },
    });
    console.log(`${LOG_PREFIX} Synced Pro plan price IDs from Polar API`);
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to sync Pro plan price IDs:`, err);
  }
}

async function findPlanByPriceIdWithSync(priceId: string) {
  let plan = await findPlanByPriceId(priceId);
  if (plan) return plan;
  await syncProPlanPriceIdsFromPolar();
  plan = await findPlanByPriceId(priceId);
  if (plan) return plan;
  const proPlans = await db.plan.findMany({ where: { planType: "pro" } });
  return proPlans.find((p) => matchesPriceId(p, priceId)) ?? null;
}

function getUserId(sub: PolarSubscription): string | null {
  return sub.metadata?.userId ?? sub.user_metadata?.userId ?? sub.customer?.externalId ?? null;
}

function getCustomerId(sub: PolarSubscription): string | null {
  return sub.customerId ?? sub.customer_id ?? sub.customer?.id ?? null;
}

function getSubscriptionFields(sub: PolarSubscription) {
  const periodStart = sub.currentPeriodStart ?? sub.current_period_start;
  const periodEnd = sub.currentPeriodEnd ?? sub.current_period_end;
  const recurringInterval = sub.recurringInterval ?? sub.recurring_interval;
  const cancelAtPeriodEnd = sub.cancelAtPeriodEnd ?? sub.cancel_at_period_end ?? false;
  return {
    customerId: getCustomerId(sub),
    periodStart: periodStart ? new Date(periodStart) : undefined,
    periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    billingInterval: recurringInterval === "year" ? "year" as const : "month" as const,
    cancelAtPeriodEnd,
  };
}

async function findExistingSubscription(sub: PolarSubscription) {
  const subscriptionId = sub.id;
  if (!subscriptionId) return null;
  let existing = await db.subscription.findFirst({ where: { subscriptionId } });
  if (existing) return existing;
  const customerId = getCustomerId(sub);
  if (!customerId) return null;
  existing = await db.subscription.findFirst({ where: { customerId } });
  if (existing) {
    await db.subscription.update({
      where: { id: existing.id },
      data: { subscriptionId },
    });
  }
  return existing;
}

async function downgradeToFreePlan(
  subscriptionId: string,
  referenceId: string,
  options?: { canceledAt?: Date }
) {
  const freePlan = await db.plan.findFirst({ where: { planType: "free" } });
  if (!freePlan) return false;
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date(currentPeriodStart);
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  const daysWithService = Math.ceil(
    (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "active",
      planId: freePlan.id,
      canceledAt: options?.canceledAt ?? new Date(),
      cancelAtPeriodEnd: false,
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
      billingInterval: "month",
      daysWithService,
      priceId: null,
    },
  });
  await syncUserLimits(referenceId, "free");
  await revalidateSubscriptionCache();
  return true;
}

async function revokeSubscriptionOnly(subscriptionId: string) {
  await db.subscription.update({
    where: { id: subscriptionId },
    data: { status: "revoked", canceledAt: new Date() },
  });
  await revalidateSubscriptionCache();
}

// --- Webhook handlers ---

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onOrderCreated: async (payload) => {
    const order = payload.data as { id?: string; metadata?: { userId?: string }; customer_id?: string };
    console.log(`${LOG_PREFIX} order.created`, order?.id ?? "no-id");
    try {
      const userId = order.metadata?.userId;
      if (!userId) {
        console.error(`${LOG_PREFIX} No user ID in order metadata`);
        return;
      }
      const customerId = order.customer_id;
      if (customerId) {
        await db.user.update({
          where: { id: userId },
          data: { customerId },
        });
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Order created handler failed:`, error);
    }
  },

  onSubscriptionCreated: async (payload) => {
    const sub = payload.data as unknown as PolarSubscription;
    console.log(`${LOG_PREFIX} subscription.created`, sub?.id ?? "no-id");
    try {
      const userId = getUserId(sub);
      if (!userId) {
        console.error(`${LOG_PREFIX} No user ID in subscription metadata`);
        return;
      }
      const priceId = getPriceId(sub);
      if (!priceId) {
        console.error(`${LOG_PREFIX} No price ID in subscription`);
        return;
      }
      const plan = await findPlanByPriceIdWithSync(priceId);
      if (!plan) {
        console.error(`${LOG_PREFIX} Plan not found for price ID:`, priceId, "Product:", sub.product?.name);
        return;
      }
      const fields = getSubscriptionFields(sub);
      await db.subscription.upsert({
        where: { referenceId: userId },
        create: {
          referenceId: userId,
          planId: plan.id,
          priceId,
          subscriptionId: sub.id,
          customerId: fields.customerId ?? undefined,
          status: sub.status ?? "active",
          provider: "polar",
          periodStart: fields.periodStart!,
          periodEnd: fields.periodEnd!,
          billingInterval: fields.billingInterval,
          cancelAtPeriodEnd: fields.cancelAtPeriodEnd,
        },
        update: {
          planId: plan.id,
          priceId,
          subscriptionId: sub.id,
          customerId: fields.customerId ?? undefined,
          status: sub.status ?? "active",
          provider: "polar",
          periodStart: fields.periodStart!,
          periodEnd: fields.periodEnd!,
          billingInterval: fields.billingInterval,
          cancelAtPeriodEnd: fields.cancelAtPeriodEnd,
        },
      });
      if (fields.customerId) {
        await db.user.update({
          where: { id: userId },
          data: { customerId: fields.customerId },
        });
      }
      await syncUserLimits(userId, plan.planType);
      await revalidateSubscriptionCache();
    } catch (error) {
      console.error(`${LOG_PREFIX} Subscription creation failed:`, error);
      throw error;
    }
  },

  onSubscriptionUpdated: async (payload) => {
    const sub = payload.data as unknown as PolarSubscription;
    console.log(`${LOG_PREFIX} subscription.updated`, sub?.id ?? "no-id", sub?.status);
    try {
      const existing = await findExistingSubscription(sub);
      if (!existing) {
        console.error(`${LOG_PREFIX} Subscription not found:`, sub.id);
        return;
      }
      const status = sub.status ?? existing.status;
      const fields = getSubscriptionFields(sub);

      if (status === "canceled" || status === "revoked") {
        const ok = await downgradeToFreePlan(existing.id, existing.referenceId, {
          canceledAt: status === "canceled" || status === "revoked" ? new Date() : undefined,
        });
        if (!ok) {
          console.error(`${LOG_PREFIX} Free plan not found`);
        }
        return;
      }

      const priceId = getPriceId(sub);
      let updatedPlan: Awaited<ReturnType<typeof findPlanByPriceId>> = null;
      if (priceId && priceId !== existing.priceId) {
        updatedPlan = await findPlanByPriceId(priceId);
      }

      const updateData: Record<string, unknown> = {
        status,
        cancelAtPeriodEnd: fields.cancelAtPeriodEnd,
        ...(updatedPlan && { planId: updatedPlan.id, priceId }),
      };
      if (fields.periodStart) updateData.periodStart = fields.periodStart;
      if (fields.periodEnd) updateData.periodEnd = fields.periodEnd;

      await db.subscription.update({
        where: { id: existing.id },
        data: updateData,
      });
      if (updatedPlan) {
        await syncUserLimits(existing.referenceId, updatedPlan.planType);
      }
      await revalidateSubscriptionCache();
    } catch (error) {
      console.error(`${LOG_PREFIX} Subscription update failed:`, error);
      throw error;
    }
  },

  onSubscriptionActive: async (payload) => {
    const sub = payload.data as unknown as PolarSubscription;
    console.log(`${LOG_PREFIX} subscription.active`, sub?.id ?? "no-id");
    try {
      let existing = await findExistingSubscription(sub);
      if (!existing) {
        const userId = getUserId(sub);
        if (!userId) {
          console.error(`${LOG_PREFIX} Cannot create subscription - no user ID`);
          return;
        }
        const priceId = getPriceId(sub);
        if (!priceId) {
          console.error(`${LOG_PREFIX} Cannot create subscription - no price ID`);
          return;
        }
        const plan = await findPlanByPriceIdWithSync(priceId);
        if (!plan) {
          console.error(`${LOG_PREFIX} Plan not found for price:`, priceId);
          return;
        }
        const fields = getSubscriptionFields(sub);
        existing = await db.subscription.create({
          data: {
            referenceId: userId,
            planId: plan.id,
            priceId,
            subscriptionId: sub.id,
            customerId: fields.customerId ?? undefined,
            status: "active",
            provider: "polar",
            periodStart: fields.periodStart!,
            periodEnd: fields.periodEnd!,
            billingInterval: fields.billingInterval,
            cancelAtPeriodEnd: false,
          },
        });
        await syncUserLimits(userId, plan.planType);
      } else {
        const fields = getSubscriptionFields(sub);
        const updateData: Record<string, unknown> = { status: "active" };
        if (fields.periodStart) updateData.periodStart = fields.periodStart;
        if (fields.periodEnd) updateData.periodEnd = fields.periodEnd;
        await db.subscription.update({
          where: { id: existing.id },
          data: updateData,
        });
      }
      await revalidateSubscriptionCache();
    } catch (error) {
      console.error(`${LOG_PREFIX} Subscription activation failed:`, error);
      throw error;
    }
  },

  onSubscriptionCanceled: async (payload) => {
    const sub = payload.data as unknown as PolarSubscription;
    console.log(`${LOG_PREFIX} subscription.canceled`, sub?.id ?? "no-id");
    try {
      const existing = await findExistingSubscription(sub);
      if (!existing) {
        console.error(`${LOG_PREFIX} Subscription not found:`, sub.id);
        return;
      }
      const canceledAt = sub.canceledAt ?? sub.canceled_at;
      await db.subscription.update({
        where: { id: existing.id },
        data: {
          status: "active",
          canceledAt: canceledAt ? new Date(canceledAt) : new Date(),
          cancelAtPeriodEnd: true,
        },
      });
      await revalidateSubscriptionCache();
    } catch (error) {
      console.error(`${LOG_PREFIX} Subscription cancellation failed:`, error);
      throw error;
    }
  },

  onSubscriptionRevoked: async (payload) => {
    const sub = payload.data as unknown as PolarSubscription;
    console.log(`${LOG_PREFIX} subscription.revoked`, sub?.id ?? "no-id");
    try {
      const existing = await findExistingSubscription(sub);
      if (!existing) {
        console.error(`${LOG_PREFIX} Subscription not found:`, sub.id);
        return;
      }
      const ok = await downgradeToFreePlan(existing.id, existing.referenceId, { canceledAt: new Date() });
      if (!ok) {
        console.error(`${LOG_PREFIX} Free plan not found`);
        await revokeSubscriptionOnly(existing.id);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Subscription revocation failed:`, error);
      throw error;
    }
  },
});
