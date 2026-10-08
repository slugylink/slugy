import "server-only";
import { db } from "@/server/db";
import {
  reconcileSubscriptionIfStale,
  reconcileUserEntitlement,
  subscriptionWithPlanSelect,
  isLifetimeBillingPeriod,
} from "./reconcile";
export async function getActiveSubscription(userId: string) {
  try {
    // Powers the client subscription store / upgrade popup — self-heal first so
    // a missed webhook doesn't leave the UI stuck on Free/Basic.
    await reconcileUserEntitlement(userId);

    const rawSubscription = await db.subscription.findFirst({
      where: {
        referenceId: userId,
        status: {
          in: ["active", "trialing"],
        },
      },
      select: subscriptionWithPlanSelect,
    });

    const subscription = await reconcileSubscriptionIfStale(rawSubscription);

    if (
      !subscription ||
      !["active", "trialing"].includes(subscription.status.toLowerCase())
    ) {
      return {
        msg: "No active subscription",
        status: false,
        subscription: null,
      };
    }

    return { msg: "Success", status: true, subscription };
  } catch (error) {
    console.error("Get active subscription error:", error);
    return { msg: "Internal server error", status: false, subscription: null };
  }
}

export async function getSubscriptionWithPlan(userId: string) {
  try {
    // Self-heal from Polar when the stored entitlement is Free/missing/expired
    // (e.g. a missed or failed webhook). Upgrade-only + throttled.
    await reconcileUserEntitlement(userId);

    const rawSubscription = await db.subscription.findFirst({
      where: {
        referenceId: userId,
        status: {
          in: ["active", "trialing"],
        },
      },
      select: subscriptionWithPlanSelect,
    });
    const subscription = await reconcileSubscriptionIfStale(rawSubscription);

    if (
      !subscription ||
      !["active", "trialing"].includes(subscription.status.toLowerCase())
    ) {
      return {
        success: false,
        message: "No active subscription found",
        subscription: null,
      };
    }

    const now = new Date();
    if (
      subscription.periodEnd <= now &&
      !isLifetimeBillingPeriod(
        subscription.plan.planType,
        subscription.periodStart,
        subscription.periodEnd,
      )
    ) {
      return {
        success: false,
        message: "Subscription expired",
        subscription: null,
      };
    }

    return {
      success: true,
      message: "Subscription found",
      subscription,
    };
  } catch (error) {
    console.error("Error getting subscription with plan:", error);
    return {
      success: false,
      message: "Failed to get subscription",
      subscription: null,
    };
  }
}
