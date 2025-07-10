"use server";
import { db } from "@/server/db";

export async function createFreeSubscription(userId: string) {
  try {
    const result = await db.$transaction(async (tx) => {
      // Check for active subscription and get free plan in parallel
      const [activeSubscription, freePlan] = await Promise.all([
        tx.subscription.findFirst({
          where: { referenceId: userId, status: "active" },
        }),
        tx.plan.findFirst({
          where: { planType: "free" },
          select: { id: true },
        }),
      ]);

      if (activeSubscription) {
        return {
          success: true,
          message: "User already has a subscription",
        };
      }

      if (!freePlan) {
        throw new Error("Free plan not found in database");
      }

      // Calculate subscription period dates more efficiently
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(currentPeriodStart);

      // For free plan, set to 20 years
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 20);

      // Calculate days between periodStart and periodEnd
      const daysWithService = Math.ceil(
        (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
          (1000 * 60 * 60 * 24), // in milliseconds
      );

      await tx.subscription.create({
        data: {
          referenceId: userId,
          planId: freePlan.id,
          status: "active",
          provider: "internal",
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          daysWithService: daysWithService,
          billingInterval: "month",
          billingCycle: 1,
        },
      });

      return {
        success: true,
        message: "Free subscription created successfully",
      };
    });

    return result;
  } catch (error) {
    console.error("Error creating free subscription:", error);
    return {
      success: false,
      message: "Failed to create free subscription",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
