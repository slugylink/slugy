import { Interval, PlanType, Prisma } from "@prisma/client";

import { polarClient } from "@/lib/polar";
import { downgradeToBasicLimits } from "@/lib/subscription/basic-entitlement";
import {
  revalidateSubscriptionCache,
  syncUserLimits,
} from "@/lib/subscription/limits-sync";
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
      maxUtmTemplates: true,
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
  productName?: string;
  hasForeverDiscount: boolean;
};

const LIFETIME_PERIOD_YEARS = 100;

/** Polar product names are "Pro [monthly]" / "Business" / "Basic [yearly]"… */
export function getPlanTypeByProductName(
  name?: string | null,
): "basic" | "pro" | "business" | null {
  const normalized = (name ?? "").toLowerCase().trim();
  if (!normalized) return null;
  if (normalized.includes("business")) return "business";
  if (normalized.includes("basic")) return "basic";
  if (normalized.includes("pro")) return "pro";
  return null;
}

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
    productName: remote.product?.name,
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

  // Price mapping didn't identify a paid plan (stale/empty price IDs) — fall
  // back to the Polar product name so we never strand a paying customer.
  const currentPlanType = subscription.plan.planType?.toLowerCase();
  if (
    (currentPlanType === "free" || currentPlanType === "basic") &&
    remote.productName
  ) {
    const byName = getPlanTypeByProductName(remote.productName);
    if (byName && byName !== "basic") {
      const namePlan = await db.plan.findFirst({
        where: { planType: byName },
        select: { id: true, planType: true },
      });
      if (namePlan) {
        nextPlanId = namePlan.id;
        nextPlanType = namePlan.planType;
      }
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
  const normalized = planType?.toLowerCase();
  // Basic is a one-time lifetime entitlement.
  if (normalized === "basic") return true;
  // Free is NOT a paid entitlement — it just has a far-future period so the
  // row never expires. Treating it as "lifetime" leaked the "(discounted Pro)"
  // label and skipped downgrade logic.
  if (!normalized || normalized === "free") return false;
  if (!periodStart || !periodEnd) return false;

  const years =
    (periodEnd.getTime() - periodStart.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  return years >= LIFETIME_PERIOD_YEARS - 1;
}

/** Extract the active price id attached to a Polar subscription, if any. */
function getRemotePriceId(remote: PolarSubscriptionRemote): string | null {
  return remote.prices?.find((price) => Boolean(price.id))?.id ?? null;
}

/**
 * Map a Polar subscription to a DB plan. Prefers the price id mapping, then
 * falls back to the product name (e.g. "Pro [monthly]" → pro). The fallback
 * is what recovers subscriptions when stored plan price IDs are stale/wrong.
 */
async function resolvePlanFromRemote(
  remote: PolarSubscriptionRemote,
): Promise<{ id: string; planType: string } | null> {
  const priceId = getRemotePriceId(remote);
  if (priceId) {
    const byPrice = await db.plan.findFirst({
      where: { OR: [{ monthlyPriceId: priceId }, { yearlyPriceId: priceId }] },
      select: { id: true, planType: true },
    });
    if (byPrice) return byPrice;
  }

  const planType = getPlanTypeByProductName(remote.product?.name);
  if (!planType) return null;
  return db.plan.findFirst({
    where: { planType },
    select: { id: true, planType: true },
  });
}

async function fetchBestActiveSubscription(
  customerId: string,
): Promise<PolarSubscriptionRemote | null> {
  try {
    const iterator = await polarClient.subscriptions.list({
      customerId,
      limit: 20,
    });

    const collected: PolarSubscriptionRemote[] = [];
    for await (const page of iterator) {
      collected.push(...(page.result?.items ?? []));
    }

    return pickBestPolarSubscription(collected);
  } catch (error) {
    console.warn("[Subscription Reconcile] Entitlement lookup failed:", {
      customerId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/** Find the Polar customer tied to our user id (checkout sets externalId). */
async function fetchCustomerIdByExternalId(
  userId: string,
): Promise<string | null> {
  try {
    const customer = await polarClient.customers.getExternal({
      externalId: userId,
    });
    return customer?.id ?? null;
  } catch {
    return null;
  }
}

const ENTITLEMENT_RECONCILE_TTL_MS = 60 * 1000;
const entitlementReconcileAttempts = new Map<string, number>();

/**
 * Upgrade-only self-healing entitlement reconcile. If the stored entitlement
 * is Free / missing / expired but Polar has an active paid subscription for
 * the customer, pull it into the DB. Never downgrades here — downgrades are
 * owned by verified webhooks. Throttled per user to bound Polar API calls.
 */
export async function reconcileUserEntitlement(
  userId: string,
): Promise<SubscriptionWithPlan | null> {
  try {
    const subscription = await db.subscription.findUnique({
      where: { referenceId: userId },
      select: subscriptionWithPlanSelect,
    });

    const now = new Date();
    const planType = subscription?.plan.planType?.toLowerCase();
    const status = subscription?.status?.toLowerCase() ?? "";
    const isPaidPlan = planType === "pro" || planType === "business";
    const isActive = status === "active" || status === "trialing";

    const isHealthyPaid =
      Boolean(subscription) &&
      isActive &&
      isPaidPlan &&
      (subscription!.periodEnd > now ||
        isLifetimeBillingPeriod(
          planType,
          subscription!.periodStart,
          subscription!.periodEnd,
        ));

    if (isHealthyPaid) return subscription;

    const lastAttempt = entitlementReconcileAttempts.get(userId) ?? 0;
    if (now.getTime() - lastAttempt < ENTITLEMENT_RECONCILE_TTL_MS) {
      return subscription;
    }
    entitlementReconcileAttempts.set(userId, now.getTime());
    if (entitlementReconcileAttempts.size > 10_000) {
      entitlementReconcileAttempts.clear();
    }

    let customerId = subscription?.customerId ?? null;
    if (!customerId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { customerId: true },
      });
      customerId = user?.customerId ?? null;
    }

    // Try the stored customer first, then fall back to the checkout external id
    // (covers stale/missing user.customerId after an earlier purchase).
    let remote = customerId
      ? await fetchBestActiveSubscription(customerId)
      : null;
    if (!remote) {
      const externalCustomerId = await fetchCustomerIdByExternalId(userId);
      if (externalCustomerId && externalCustomerId !== customerId) {
        remote = await fetchBestActiveSubscription(externalCustomerId);
      }
    }
    if (!remote) return subscription;

    const resolvedPlan = await resolvePlanFromRemote(remote);
    if (!resolvedPlan) return subscription;

    const periodStart =
      coercePolarDate(remote.currentPeriodStart) ?? new Date();
    const periodEnd = resolveStoredPeriodEnd(remote, periodStart, periodStart);
    const remoteStatus = normalizeDbStatus(
      remote.status,
      periodEnd,
      now,
      remote.cancelAtPeriodEnd,
      hasForeverDiscount(remote),
    );

    const priceId = getRemotePriceId(remote);
    const updated = await db.subscription.upsert({
      where: { referenceId: userId },
      create: {
        referenceId: userId,
        planId: resolvedPlan.id,
        priceId: priceId ?? undefined,
        subscriptionId: remote.id,
        customerId: remote.customerId,
        status: remoteStatus,
        provider: "polar",
        periodStart,
        periodEnd,
        billingInterval: normalizeBillingInterval(remote.recurringInterval),
        cancelAtPeriodEnd: remote.cancelAtPeriodEnd,
        canceledAt: coercePolarDate(remote.canceledAt) ?? null,
      },
      update: {
        planId: resolvedPlan.id,
        subscriptionId: remote.id,
        customerId: remote.customerId,
        status: remoteStatus,
        provider: "polar",
        periodStart,
        periodEnd,
        billingInterval: normalizeBillingInterval(remote.recurringInterval),
        cancelAtPeriodEnd: remote.cancelAtPeriodEnd,
        ...(priceId ? { priceId } : {}),
      },
      select: subscriptionWithPlanSelect,
    });

    await db.user.update({
      where: { id: userId },
      data: { customerId: remote.customerId },
    });
    await syncUserLimits(userId, resolvedPlan.planType as PlanType);
    try {
      await revalidateSubscriptionCache();
    } catch {
      // Cache revalidation is best-effort outside a request scope.
    }

    return updated;
  } catch (error) {
    console.error("[Subscription Reconcile] Entitlement reconcile failed:", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

export async function reconcileSubscriptionIfStale(
  subscription: SubscriptionWithPlan | null,
): Promise<SubscriptionWithPlan | null> {
  if (!subscription) return null;

  const now = new Date();
  const planType = subscription.plan.planType?.toLowerCase();
  const shouldRefresh =
    subscription.provider === "polar" &&
    (planType === "pro" || planType === "business") &&
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
