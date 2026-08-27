import { db } from "@/server/db";
import {
  syncUserLimits,
  revalidateSubscriptionCache,
} from "@/lib/subscription/limits-sync";
import { polarClient } from "@/lib/polar";
import {
  activateBasicEntitlement,
  downgradeToBasicLimits,
} from "@/lib/subscription/basic-entitlement";

export const LOG_PREFIX = "[Polar]";

export type PolarWebhookEventType =
  | "order.created"
  | "order.paid"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.active"
  | "subscription.canceled"
  | "subscription.revoked";

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

type PolarOrder = {
  id?: string;
  status?: string;
  paid?: boolean;
  totalAmount?: number;
  total_amount?: number;
  customerId?: string;
  customer_id?: string;
  productId?: string;
  product_id?: string;
  subscriptionId?: string | null;
  subscription_id?: string | null;
  metadata?: { userId?: string };
  customer?: { id?: string; externalId?: string; external_id?: string };
  product?: { name?: string };
  items?: {
    productPriceId?: string | null;
    product_price_id?: string | null;
  }[];
};

function getPriceId(sub: PolarSubscription): string | null {
  const id =
    sub.prices?.[0]?.id ?? sub.product?.prices?.[0]?.id ?? sub.priceId ?? null;
  return id ?? null;
}

function matchesPriceId(
  plan: { monthlyPriceId: string | null; yearlyPriceId: string | null },
  priceId: string,
): boolean {
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
      OR: [{ monthlyPriceId: { not: null } }, { yearlyPriceId: { not: null } }],
    },
  });
  return plans.find((p) => matchesPriceId(p, priceId)) ?? null;
}

function getPlanTypeByProductName(name?: string): "basic" | "pro" | null {
  const normalized = (name ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes("basic")) return "basic";
  if (normalized.includes("pro")) return "pro";
  return null;
}

function getOrderUserId(order: PolarOrder): string | null {
  return (
    order.metadata?.userId ??
    order.customer?.externalId ??
    order.customer?.external_id ??
    null
  );
}

function getOrderCustomerId(order: PolarOrder): string | null {
  return order.customerId ?? order.customer_id ?? order.customer?.id ?? null;
}

function getOrderPriceId(order: PolarOrder): string | null {
  const item = order.items?.find(
    (item) => item.productPriceId || item.product_price_id,
  );
  return item?.productPriceId ?? item?.product_price_id ?? null;
}

async function isBasicOrder(order: PolarOrder): Promise<boolean> {
  if (getPlanTypeByProductName(order.product?.name) === "basic") return true;

  const productId = order.productId ?? order.product_id;
  const priceId = getOrderPriceId(order);
  if (!productId && !priceId) return false;

  const basicPlan = await db.plan.findFirst({
    where: { planType: "basic" },
    select: { monthlyPriceId: true, yearlyPriceId: true },
  });

  return (
    Boolean(priceId) &&
    (basicPlan?.monthlyPriceId === priceId ||
      basicPlan?.yearlyPriceId === priceId)
  );
}

async function activateBasicOrderEntitlement(order: PolarOrder) {
  const userId = getOrderUserId(order);
  const customerId = getOrderCustomerId(order);
  const paid =
    order.paid === true ||
    order.status === "paid" ||
    (order.totalAmount ?? order.total_amount) === 0;

  if (!userId || !customerId || !paid || !(await isBasicOrder(order))) {
    return false;
  }

  await activateBasicEntitlement({
    userId,
    customerId,
    priceId: getOrderPriceId(order),
  });
  await revalidateSubscriptionCache();
  return true;
}

async function syncPlanPriceIdsFromPolar(): Promise<void> {
  try {
    const response = await polarClient.products.list({ isArchived: false });
    const items = response?.result?.items ?? [];

    const updates: Record<
      "basic" | "pro",
      { monthlyPriceId: string | null; yearlyPriceId: string | null }
    > = {
      basic: { monthlyPriceId: null, yearlyPriceId: null },
      pro: { monthlyPriceId: null, yearlyPriceId: null },
    };

    for (const product of items) {
      const planType = getPlanTypeByProductName(product.name ?? "");
      if (!planType) continue;

      for (const price of product.prices ?? []) {
        const raw = price as {
          id?: string;
          recurring_interval?: string;
          recurringInterval?: string;
        };
        const id = raw.id ?? "";
        const interval = (raw.recurringInterval ??
          raw.recurring_interval ??
          "") as string;
        if (!id) continue;
        if (interval === "month") updates[planType].monthlyPriceId = id;
        if (interval === "year") updates[planType].yearlyPriceId = id;
        if (!interval && planType === "basic") {
          // Basic can be a one-time "forever" product (non-recurring).
          updates.basic.monthlyPriceId = id;
          updates.basic.yearlyPriceId = id;
        }
      }
    }

    for (const planType of ["basic", "pro"] as const) {
      const monthlyPriceId = updates[planType].monthlyPriceId;
      const yearlyPriceId = updates[planType].yearlyPriceId;
      if (!monthlyPriceId && !yearlyPriceId) continue;

      const plan = await db.plan.findFirst({ where: { planType } });
      if (!plan) continue;

      await db.plan.update({
        where: { id: plan.id },
        data: {
          ...(monthlyPriceId && { monthlyPriceId }),
          ...(yearlyPriceId && { yearlyPriceId }),
        },
      });
    }

    console.log(`${LOG_PREFIX} Synced Basic/Pro plan price IDs from Polar API`);
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to sync plan price IDs:`, err);
  }
}

async function findPlanByPriceIdWithSync(priceId: string) {
  let plan = await findPlanByPriceId(priceId);
  if (plan) return plan;
  await syncPlanPriceIdsFromPolar();
  plan = await findPlanByPriceId(priceId);
  if (plan) return plan;
  const candidatePlans = await db.plan.findMany({
    where: { planType: { in: ["basic", "pro"] } },
  });
  return candidatePlans.find((p) => matchesPriceId(p, priceId)) ?? null;
}

function getUserId(sub: PolarSubscription): string | null {
  return (
    sub.metadata?.userId ??
    sub.user_metadata?.userId ??
    sub.customer?.externalId ??
    null
  );
}

function getCustomerId(sub: PolarSubscription): string | null {
  return sub.customerId ?? sub.customer_id ?? sub.customer?.id ?? null;
}

function getSubscriptionFields(sub: PolarSubscription) {
  const periodStart = sub.currentPeriodStart ?? sub.current_period_start;
  const periodEnd = sub.currentPeriodEnd ?? sub.current_period_end;
  const recurringInterval = sub.recurringInterval ?? sub.recurring_interval;
  const cancelAtPeriodEnd =
    sub.cancelAtPeriodEnd ?? sub.cancel_at_period_end ?? false;
  return {
    customerId: getCustomerId(sub),
    periodStart: periodStart ? new Date(periodStart) : undefined,
    periodEnd: periodEnd ? new Date(periodEnd) : undefined,
    billingInterval:
      recurringInterval === "year" ? ("year" as const) : ("month" as const),
    cancelAtPeriodEnd,
  };
}

function getNormalizedPeriodEnd(
  planType: "basic" | "pro",
  periodStart: Date,
  periodEnd?: Date,
): Date {
  // Basic is a one-time forever plan. If provider doesn't send recurring
  // bounds, keep it active for a long lifetime window.
  if (planType === "basic") {
    if (!periodEnd || periodEnd <= periodStart) {
      const lifetimeEnd = new Date(periodStart);
      lifetimeEnd.setFullYear(lifetimeEnd.getFullYear() + 100);
      return lifetimeEnd;
    }
    return periodEnd;
  }

  if (periodEnd) return periodEnd;
  const fallbackEnd = new Date(periodStart);
  fallbackEnd.setMonth(fallbackEnd.getMonth() + 1);
  return fallbackEnd;
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

async function deactivateSubscription(
  subscriptionId: string,
  options?: { canceledAt?: Date },
) {
  await downgradeToBasicLimits({
    subscriptionId,
    canceledAt: options?.canceledAt,
  });
  await revalidateSubscriptionCache();
  return true;
}

function normalizeIncomingStatus(status: string): string {
  return status.toLowerCase().trim();
}

/**
 * Maps Polar statuses for our access model:
 * - canceled + still in paid period → keep active with cancelAtPeriodEnd
 * - past_due/unpaid within period → grace (active)
 * - past_due/unpaid/canceled after period → inactive (caller deactivates)
 */
function resolveUpdatedAccess(input: {
  remoteStatus: string;
  cancelAtPeriodEnd: boolean;
  periodEnd: Date | undefined;
  now?: Date;
}): {
  action: "deactivate" | "cancel_at_period_end" | "update";
  status: string;
  cancelAtPeriodEnd: boolean;
} {
  const now = input.now ?? new Date();
  const status = normalizeIncomingStatus(input.remoteStatus);
  const periodEnded = Boolean(input.periodEnd && input.periodEnd <= now);
  const cancelAtPeriodEnd =
    input.cancelAtPeriodEnd || status === "canceled" || status === "cancelled";

  if (status === "revoked") {
    return {
      action: "deactivate",
      status: "inactive",
      cancelAtPeriodEnd: false,
    };
  }

  if (
    (status === "past_due" || status === "unpaid" || cancelAtPeriodEnd) &&
    periodEnded
  ) {
    return {
      action: "deactivate",
      status: "inactive",
      cancelAtPeriodEnd: false,
    };
  }

  if (cancelAtPeriodEnd) {
    return {
      action: "cancel_at_period_end",
      status: "active",
      cancelAtPeriodEnd: true,
    };
  }

  if (status === "past_due" || status === "unpaid") {
    // Grace while still inside the paid period.
    return { action: "update", status: "active", cancelAtPeriodEnd: false };
  }

  return {
    action: "update",
    status: status || "active",
    cancelAtPeriodEnd: false,
  };
}

async function handleOrderCreated(order: PolarOrder) {
  console.log(`${LOG_PREFIX} order.created`, order?.id ?? "no-id");
  if (await activateBasicOrderEntitlement(order)) return;

  const userId = getOrderUserId(order);
  if (!userId) {
    console.error(`${LOG_PREFIX} No user ID in order metadata`);
    return;
  }
  const customerId = getOrderCustomerId(order);
  if (customerId) {
    await db.user.update({
      where: { id: userId },
      data: { customerId },
    });
  }
}

async function handleOrderPaid(order: PolarOrder) {
  console.log(`${LOG_PREFIX} order.paid`, order?.id ?? "no-id");
  await activateBasicOrderEntitlement(order);
}

async function handleSubscriptionCreated(sub: PolarSubscription) {
  console.log(`${LOG_PREFIX} subscription.created`, sub?.id ?? "no-id");
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
    console.error(
      `${LOG_PREFIX} Plan not found for price ID:`,
      priceId,
      "Product:",
      sub.product?.name,
    );
    return;
  }
  const fields = getSubscriptionFields(sub);
  const periodStart = fields.periodStart ?? new Date();
  const periodEnd = getNormalizedPeriodEnd(
    plan.planType as "basic" | "pro",
    periodStart,
    fields.periodEnd,
  );
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
      periodStart,
      periodEnd,
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
      periodStart,
      periodEnd,
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
}

async function handleSubscriptionUpdated(sub: PolarSubscription) {
  console.log(
    `${LOG_PREFIX} subscription.updated`,
    sub?.id ?? "no-id",
    sub?.status,
  );
  const existing = await findExistingSubscription(sub);
  if (!existing) {
    console.error(`${LOG_PREFIX} Subscription not found:`, sub.id);
    return;
  }
  const fields = getSubscriptionFields(sub);
  const remoteStatus = sub.status ?? existing.status;
  const periodEnd = fields.periodEnd ?? existing.periodEnd;
  const access = resolveUpdatedAccess({
    remoteStatus,
    cancelAtPeriodEnd: fields.cancelAtPeriodEnd,
    periodEnd,
  });

  if (access.action === "deactivate") {
    const canceledAt = sub.canceledAt ?? sub.canceled_at;
    await deactivateSubscription(existing.id, {
      canceledAt: canceledAt ? new Date(canceledAt) : new Date(),
    });
    return;
  }

  const priceId = getPriceId(sub);
  let updatedPlan: Awaited<ReturnType<typeof findPlanByPriceId>> = null;
  if (priceId && priceId !== existing.priceId) {
    updatedPlan = await findPlanByPriceIdWithSync(priceId);
  }

  const updateData: Record<string, unknown> = {
    status: access.status,
    cancelAtPeriodEnd: access.cancelAtPeriodEnd,
    ...(updatedPlan && { planId: updatedPlan.id, priceId }),
  };
  if (fields.periodStart) updateData.periodStart = fields.periodStart;
  if (fields.periodEnd) updateData.periodEnd = fields.periodEnd;
  if (access.action === "cancel_at_period_end") {
    const canceledAt = sub.canceledAt ?? sub.canceled_at;
    updateData.canceledAt = canceledAt ? new Date(canceledAt) : new Date();
  }

  await db.subscription.update({
    where: { id: existing.id },
    data: updateData,
  });
  if (updatedPlan) {
    await syncUserLimits(existing.referenceId, updatedPlan.planType);
  }
  await revalidateSubscriptionCache();
}

async function handleSubscriptionActive(sub: PolarSubscription) {
  console.log(`${LOG_PREFIX} subscription.active`, sub?.id ?? "no-id");
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
    const periodStart = fields.periodStart ?? new Date();
    const periodEnd = getNormalizedPeriodEnd(
      plan.planType as "basic" | "pro",
      periodStart,
      fields.periodEnd,
    );
    existing = await db.subscription.create({
      data: {
        referenceId: userId,
        planId: plan.id,
        priceId,
        subscriptionId: sub.id,
        customerId: fields.customerId ?? undefined,
        status: "active",
        provider: "polar",
        periodStart,
        periodEnd,
        billingInterval: fields.billingInterval,
        cancelAtPeriodEnd: false,
      },
    });
    await syncUserLimits(userId, plan.planType);
  } else {
    const fields = getSubscriptionFields(sub);
    const updateData: Record<string, unknown> = {
      status: "active",
      cancelAtPeriodEnd: false,
    };
    if (fields.periodStart) updateData.periodStart = fields.periodStart;
    if (fields.periodEnd) updateData.periodEnd = fields.periodEnd;
    const priceId = getPriceId(sub);
    let plan: Awaited<ReturnType<typeof findPlanByPriceIdWithSync>> = null;
    if (priceId) {
      plan = await findPlanByPriceIdWithSync(priceId);
      if (plan) {
        updateData.planId = plan.id;
        updateData.priceId = priceId;
      }
    }
    await db.subscription.update({
      where: { id: existing.id },
      data: updateData,
    });
    if (plan) {
      await syncUserLimits(existing.referenceId, plan.planType);
    }
  }
  await revalidateSubscriptionCache();
}

async function handleSubscriptionCanceled(sub: PolarSubscription) {
  console.log(`${LOG_PREFIX} subscription.canceled`, sub?.id ?? "no-id");
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
}

async function handleSubscriptionRevoked(sub: PolarSubscription) {
  console.log(`${LOG_PREFIX} subscription.revoked`, sub?.id ?? "no-id");
  const existing = await findExistingSubscription(sub);
  if (!existing) {
    console.error(`${LOG_PREFIX} Subscription not found:`, sub.id);
    return;
  }
  await deactivateSubscription(existing.id, { canceledAt: new Date() });
}

/**
 * Applies Polar webhook side effects. Throws on unexpected failures so
 * Inngest can retry. Missing metadata / unknown plans return without throw
 * (same as before — retrying would not help).
 */
export async function processPolarWebhookEvent(
  type: PolarWebhookEventType,
  payload: unknown,
): Promise<{ type: PolarWebhookEventType; ok: true }> {
  switch (type) {
    case "order.created":
      await handleOrderCreated(payload as PolarOrder);
      break;
    case "order.paid":
      await handleOrderPaid(payload as PolarOrder);
      break;
    case "subscription.created":
      await handleSubscriptionCreated(payload as PolarSubscription);
      break;
    case "subscription.updated":
      await handleSubscriptionUpdated(payload as PolarSubscription);
      break;
    case "subscription.active":
      await handleSubscriptionActive(payload as PolarSubscription);
      break;
    case "subscription.canceled":
      await handleSubscriptionCanceled(payload as PolarSubscription);
      break;
    case "subscription.revoked":
      await handleSubscriptionRevoked(payload as PolarSubscription);
      break;
    default: {
      const exhaustive: never = type;
      throw new Error(`Unhandled Polar webhook type: ${exhaustive}`);
    }
  }

  return { type, ok: true };
}
