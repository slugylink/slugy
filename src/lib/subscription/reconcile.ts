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

/**
 * Normalize Polar remote status for our DB access model.
 * past_due/unpaid never become "active" after the paid period ends.
 */
function normalizeDbStatus(
  status: string,
  periodEnd: Date,
  now: Date,
  cancelAtPeriodEnd: boolean,
): "active" | "inactive" | string {
  const normalized = status.toLowerCase().trim();

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

export async function reconcileSubscriptionIfStale(
  subscription: SubscriptionWithPlan | null,
): Promise<SubscriptionWithPlan | null> {
  if (!subscription) return null;

  const now = new Date();
  const shouldRefresh =
    subscription.provider === "polar" &&
    subscription.plan.planType === "pro" &&
    subscription.subscriptionId &&
    subscription.periodEnd <= now;

  if (!shouldRefresh) {
    return subscription;
  }

  try {
    const subscriptionId = subscription.subscriptionId;
    if (!subscriptionId) {
      return subscription;
    }

    const remote = await polarClient.subscriptions.get({
      id: subscriptionId,
    });

    const nextPeriodStart =
      remote.currentPeriodStart ?? subscription.periodStart;
    const nextPeriodEnd = remote.currentPeriodEnd ?? subscription.periodEnd;
    const nextCancelAtPeriodEnd =
      remote.cancelAtPeriodEnd ?? subscription.cancelAtPeriodEnd;
    const remoteStatus = normalizeDbStatus(
      remote.status,
      nextPeriodEnd,
      now,
      nextCancelAtPeriodEnd,
    );
    const nextBillingInterval = normalizeBillingInterval(
      remote.recurringInterval,
    );
    const nextPriceId =
      remote.prices.find((price) => Boolean(price.id))?.id ??
      subscription.priceId;

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
        ...(nextPriceId ? { priceId: nextPriceId } : {}),
      },
      select: subscriptionWithPlanSelect,
    });

    await syncUserLimits(updated.referenceId, updated.plan.planType);

    return updated;
  } catch (error) {
    console.error("[Subscription Reconcile] Failed to refresh subscription:", {
      subscriptionId: subscription.subscriptionId,
      referenceId: subscription.referenceId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return subscription;
  }
}
