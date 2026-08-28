import { Interval, Prisma } from "@prisma/client";

import { polarClient } from "@/lib/polar";
import { downgradeToBasicLimits } from "@/lib/subscription/basic-entitlement";
import { syncUserLimits } from "@/lib/subscription/limits-sync";
import { db } from "@/server/db";

const subscriptionPlanSelect = {
  id: true,
  customerId: true,
  subscriptionId: true,
  provider: true,
  status: true,
  periodStart: true,
  periodEnd: true,
  cancelAtPeriodEnd: true,
  canceledAt: true,
  billingInterval: true,
  priceId: true,
  referenceId: true,
  plan: {
    select: {
      id: true,
      name: true,
      planType: true,
      maxWorkspaces: true,
      maxLinksPerWorkspace: true,
      maxClicksPerWorkspace: true,
      maxUsers: true,
      maxCustomDomains: true,
      maxGalleries: true,
      maxLinksPerBio: true,
      maxTagsPerWorkspace: true,
    },
  },
} as const;

export type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  select: typeof subscriptionPlanSelect;
}>;

export const subscriptionWithPlanSelect = subscriptionPlanSelect;

type PolarSubscriptionRemote = Awaited<
  ReturnType<typeof polarClient.subscriptions.get>
>;

type PolarSubscriptionSnapshot = {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  recurringInterval: string;
  prices: { id?: string }[];
  hasForeverDiscount: boolean;
};

const LIFETIME_PERIOD_YEARS = 100;

function coercePolarDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

export function hasForeverDiscount(remote: {
  discount?: { duration?: string | null } | null;
  status?: string | null;
}): boolean {
  const duration = remote.discount?.duration;
  if (duration !== "forever") return false;

  const status = remote.status?.toLowerCase?.() ?? "";
  return status === "active" || status === "trialing";
}

function resolveStoredPeriodEnd(
  remote: PolarSubscriptionRemote,
  periodStart: Date,
  fallbackEnd: Date,
): Date {
  if (hasForeverDiscount(remote)) {
    const lifetimeEnd = new Date(periodStart);
    lifetimeEnd.setFullYear(lifetimeEnd.getFullYear() + LIFETIME_PERIOD_YEARS);
    return lifetimeEnd;
  }

  return coercePolarDate(remote.currentPeriodEnd) ?? fallbackEnd;
}

function subscriptionPriority(remote: PolarSubscriptionRemote): number {
  const status = remote.status?.toLowerCase?.() ?? "";
  if (status !== "active" && status !== "trialing") return -1;

  let score = 0;
  if (hasForeverDiscount(remote)) score += 1_000_000;
  score += coercePolarDate(remote.currentPeriodStart)?.getTime() ?? 0;
  return score;
}

function pickBestPolarSubscription(
  items: PolarSubscriptionRemote[],
  preferredId?: string | null,
): PolarSubscriptionRemote | null {
  if (preferredId) {
    const exact = items.find((item) => item.id === preferredId);
    if (exact) return exact;
  }

  const ranked = items
    .map((item) => ({ item, score: subscriptionPriority(item) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.item ?? null;
}

/**
 * Normalize Polar remote status for our DB access model.
 * past_due/unpaid never become "active" after the paid period ends.
 */
function normalizeDbStatus(
  status: string,
  periodEnd: Date,
  now: Date,
  cancelAtPeriodEnd: boolean,
  hasForeverDiscountActive = false,
): "active" | "inactive" | string {
  const normalized = status.toLowerCase().trim();

  if (hasForeverDiscountActive) {
    return normalized === "trialing" ? "trialing" : "active";
  }

  if (normalized === "revoked") return "inactive";

  if (
    normalized === "canceled" ||
    normalized === "cancelled" ||
    cancelAtPeriodEnd
  ) {
    return periodEnd > now ? "active" : "inactive";
  }

  if (normalized === "past_due" || normalized === "unpaid") {
    return periodEnd > now ? "active" : "inactive";
  }

  return normalized;
}

function normalizeBillingInterval(
  interval: string | null | undefined,
): Interval {
  return interval === "year" ? "year" : "month";
}

function toPolarSnapshot(
  remote: PolarSubscriptionRemote,
  fallbackEnd: Date,
): PolarSubscriptionSnapshot | null {
  const periodStart = coercePolarDate(remote.currentPeriodStart);
  if (!periodStart) return null;

  const periodEnd = resolveStoredPeriodEnd(remote, periodStart, fallbackEnd);

  return {
    id: remote.id,
    status: remote.status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: remote.cancelAtPeriodEnd,
    canceledAt: coercePolarDate(remote.canceledAt) ?? null,
    recurringInterval: remote.recurringInterval,
    prices: remote.prices,
    hasForeverDiscount: hasForeverDiscount(remote),
  };
}

async function fetchPolarSubscription(
  subscription: SubscriptionWithPlan,
): Promise<PolarSubscriptionSnapshot | null> {
  if (subscription.subscriptionId) {
    try {
      const remote = await polarClient.subscriptions.get({
        id: subscription.subscriptionId,
      });
      return toPolarSnapshot(remote, subscription.periodEnd);
    } catch (error) {
      console.warn("[Subscription Reconcile] subscriptions.get failed:", {
        subscriptionId: subscription.subscriptionId,
        referenceId: subscription.referenceId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (!subscription.customerId) return null;

  try {
    const iterator = await polarClient.subscriptions.list({
      customerId: subscription.customerId,
      limit: 20,
    });

    const collected: PolarSubscriptionRemote[] = [];
    for await (const page of iterator) {
      collected.push(...(page.result?.items ?? []));
    }

    const preferred = pickBestPolarSubscription(
      collected,
      subscription.subscriptionId,
    );
    if (!preferred) return null;

    return toPolarSnapshot(preferred, subscription.periodEnd);
  } catch (error) {
    console.warn("[Subscription Reconcile] subscriptions.list failed:", {
      customerId: subscription.customerId,
      referenceId: subscription.referenceId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return null;
}

export async function syncSubscriptionFromPolar(
  subscription: SubscriptionWithPlan,
): Promise<SubscriptionWithPlan | null> {
  const remote = await fetchPolarSubscription(subscription);
  if (!remote) return subscription;

  const now = new Date();
  const nextPeriodStart = remote.currentPeriodStart;
  const nextPeriodEnd = remote.currentPeriodEnd ?? subscription.periodEnd;
  const nextCancelAtPeriodEnd =
    remote.cancelAtPeriodEnd ?? subscription.cancelAtPeriodEnd;
  const remoteStatus = normalizeDbStatus(
    remote.status,
    nextPeriodEnd,
    now,
    nextCancelAtPeriodEnd,
    remote.hasForeverDiscount,
  );
  const nextBillingInterval = normalizeBillingInterval(
    remote.recurringInterval,
  );
  const nextPriceId =
    remote.prices.find((price) => Boolean(price.id))?.id ??
    subscription.priceId;

  let nextPlanId = subscription.plan.id;
  let nextPlanType = subscription.plan.planType;
  if (nextPriceId && nextPriceId !== subscription.priceId) {
    const matchedPlan = await db.plan.findFirst({
      where: {
        OR: [{ monthlyPriceId: nextPriceId }, { yearlyPriceId: nextPriceId }],
      },
      select: { id: true, planType: true },
    });
    if (matchedPlan) {
      nextPlanId = matchedPlan.id;
      nextPlanType = matchedPlan.planType;
    }
  }

  if (remoteStatus === "inactive") {
    await downgradeToBasicLimits({
      subscriptionId: subscription.id,
      canceledAt: remote.canceledAt ?? subscription.canceledAt ?? now,
    });

    return db.subscription.findUnique({
      where: { id: subscription.id },
      select: subscriptionWithPlanSelect,
    });
  }

  const updated = await db.subscription.update({
    where: { id: subscription.id },
    data: {
      status: remoteStatus,
      periodStart: nextPeriodStart,
      periodEnd: nextPeriodEnd,
      cancelAtPeriodEnd: nextCancelAtPeriodEnd,
      canceledAt: remote.canceledAt ?? subscription.canceledAt,
      billingInterval: nextBillingInterval,
      subscriptionId: remote.id,
      planId: nextPlanId,
      ...(nextPriceId ? { priceId: nextPriceId } : {}),
    },
    select: subscriptionWithPlanSelect,
  });

  await syncUserLimits(updated.referenceId, nextPlanType);
  return updated;
}

export function isLifetimeBillingPeriod(
  planType: string | null | undefined,
  periodStart: Date | null | undefined,
  periodEnd: Date | null | undefined,
): boolean {
  if (planType?.toLowerCase() === "basic") return true;
  if (!periodStart || !periodEnd) return false;

  const years =
    (periodEnd.getTime() - periodStart.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  return years >= LIFETIME_PERIOD_YEARS - 1;
}

export async function reconcileSubscriptionIfStale(
  subscription: SubscriptionWithPlan | null,
): Promise<SubscriptionWithPlan | null> {
  if (!subscription) return null;

  const now = new Date();
  const shouldRefresh =
    subscription.provider === "polar" &&
    subscription.plan.planType === "pro" &&
    (subscription.subscriptionId || subscription.customerId) &&
    subscription.periodEnd <= now;

  if (!shouldRefresh) {
    return subscription;
  }

  try {
    return (await syncSubscriptionFromPolar(subscription)) ?? subscription;
  } catch (error) {
    console.error("[Subscription Reconcile] Failed to refresh subscription:", {
      subscriptionId: subscription.subscriptionId,
      referenceId: subscription.referenceId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return subscription;
  }
}
