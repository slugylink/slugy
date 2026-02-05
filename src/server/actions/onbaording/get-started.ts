"use server";

import { db } from "@/server/db";

const FREE_PLAN_YEARS = 20;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ERROR_MESSAGE = "Failed to create free subscription";

export async function createFreeSubscription(userId: string) {
  try {
    return await db.$transaction(async (tx) => {
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
        return { success: true as const, message: "User already has a subscription" };
      }

      if (!freePlan) {
        throw new Error("Free plan not found in database");
      }

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setFullYear(periodEnd.getFullYear() + FREE_PLAN_YEARS);

      const daysWithService = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY
      );

      await tx.subscription.create({
        data: {
          referenceId: userId,
          planId: freePlan.id,
          status: "active",
          provider: "internal",
          periodStart,
          periodEnd,
          daysWithService,
          billingInterval: "month",
          billingCycle: 1,
        },
      });

      return { success: true as const, message: "Free subscription created successfully" };
    });
  } catch {
    return { success: false as const, message: ERROR_MESSAGE };
  }
}
