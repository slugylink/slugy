"use server";
import { db } from "@/server/db";

export async function getActiveSubscription(userId: string) {
  try {
    const subscription = await db.subscription.findUnique({
      where: { referenceId: userId },
      select: { id: true, status: true },
    });

    if (!subscription) {
      return {
        msg: "No active subscription",
        status: false,
        subscription: null,
      };
    }

    return { msg: "Success", status: true, subscription: subscription };
  } catch (error) {
    console.error("Get active subscription error:", error);
    return { msg: "Internal server error", status: false, subscription: null };
  }
}

export async function getSubscriptionWithPlan(userId: string) {
  try {
    const subscription = await db.subscription.findUnique({
      where: { referenceId: userId },
      include: {
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
          },
        },
      },
    });

    if (!subscription) {
      return {
        success: false,
        message: "No active subscription found",
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
