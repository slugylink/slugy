import { Webhooks } from "@polar-sh/nextjs";
import { db } from "@/server/db";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onOrderCreated: async (payload) => {
    const order = payload.data as any;
    console.log("[Polar] Order created:", order.id);

    try {
      const userId = 
        order.metadata?.userId ||
        order.user_metadata?.userId || 
        order.user_metadata?.user_id;
      const customerId = order.customer_id;
      
      if (userId && customerId) {
        await db.user.update({
          where: { id: userId },
          data: { customerId },
        });
        console.log("[Polar] Updated user customer ID");
      }
    } catch (error) {
      console.error("[Polar] Failed to update user:", error);
    }
  },

  onSubscriptionCreated: async (payload) => {
    const subscription = payload.data as any;
    console.log("[Polar] Subscription created:", subscription.id);

    try {
      const userId = 
        subscription.metadata?.userId ||
        subscription.user_metadata?.userId || 
        subscription.user_metadata?.user_id;
      
      if (!userId) {
        console.error("[Polar] No user ID found in subscription metadata");
        return;
      }

      const priceId = 
        subscription.prices?.[0]?.id ||
        subscription.product?.prices?.[0]?.id ||
        subscription.priceId;

      if (!priceId) {
        console.error("[Polar] No price ID found in subscription");
        return;
      }

      // Find plan by price ID with trim fallback for whitespace issues
      let plan = await db.plan.findFirst({
        where: {
          OR: [
            { monthlyPriceId: priceId },
            { yearlyPriceId: priceId },
          ],
        },
      });

      // Fallback: trim whitespace
      if (!plan) {
        const allPlans = await db.plan.findMany({
          where: {
            OR: [
              { monthlyPriceId: { not: null } },
              { yearlyPriceId: { not: null } },
            ],
          },
        });
        
        plan = allPlans.find(
          (p) => 
            p.monthlyPriceId?.trim() === priceId.trim() || 
            p.yearlyPriceId?.trim() === priceId.trim()
        ) || null;
      }

      if (!plan) {
        console.error("[Polar] Plan not found for price ID:", priceId);
        console.error("[Polar] Product:", subscription.product?.name);
        return;
      }

      const subscriptionId = subscription.id;
      const customerId = subscription.customerId || subscription.customer_id || subscription.customer?.id;
      const status = subscription.status;
      const periodStart = subscription.currentPeriodStart || subscription.current_period_start;
      const periodEnd = subscription.currentPeriodEnd || subscription.current_period_end;
      const recurringInterval = subscription.recurringInterval || subscription.recurring_interval;
      const cancelAtPeriodEnd = subscription.cancelAtPeriodEnd || subscription.cancel_at_period_end || false;

      await db.subscription.upsert({
        where: { referenceId: userId },
        create: {
          referenceId: userId,
          planId: plan.id,
          priceId,
          subscriptionId,
          customerId,
          status,
          provider: "polar",
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          billingInterval: recurringInterval === "year" ? "year" : "month",
          cancelAtPeriodEnd,
        },
        update: {
          planId: plan.id,
          priceId,
          subscriptionId,
          customerId,
          status,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          billingInterval: recurringInterval === "year" ? "year" : "month",
          cancelAtPeriodEnd,
        },
      });

      if (customerId) {
        await db.user.update({
          where: { id: userId },
          data: { customerId },
        });
      }

      console.log("[Polar] Subscription created successfully");
    } catch (error) {
      console.error("[Polar] Subscription creation failed:", error);
      throw error;
    }
  },

  onSubscriptionUpdated: async (payload) => {
    const subscription = payload.data as any;
    console.log("[Polar] Subscription updated:", subscription.id);

    try {
      const subscriptionId = subscription.id;
      let existingSubscription = await db.subscription.findFirst({
        where: { subscriptionId },
      });

      if (!existingSubscription) {
        const customerId = subscription.customerId || subscription.customer_id || subscription.customer?.id;
        if (customerId) {
          existingSubscription = await db.subscription.findFirst({
            where: { customerId },
          });
          if (existingSubscription) {
            await db.subscription.update({
              where: { id: existingSubscription.id },
              data: { subscriptionId },
            });
          }
        }
        if (!existingSubscription) {
          console.error("[Polar] Subscription not found:", subscriptionId);
          return;
        }
      }

      const periodStart = subscription.currentPeriodStart || subscription.current_period_start;
      const periodEnd = subscription.currentPeriodEnd || subscription.current_period_end;
      const cancelAtPeriodEnd = subscription.cancelAtPeriodEnd || subscription.cancel_at_period_end || false;
      const status = subscription.status;

      // If subscription is canceled or revoked, set user back to free tier
      if (status === "canceled" || status === "revoked") {
        const freePlan = await db.plan.findFirst({
          where: { planType: "free" },
        });

        if (freePlan) {
          // Calculate free subscription period (20 years from now)
          const currentPeriodStart = new Date();
          const currentPeriodEnd = new Date(currentPeriodStart);
          currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 20);
          const daysWithService = Math.ceil(
            (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          await db.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              status: "active",
              planId: freePlan.id,
              canceledAt: status === "canceled" || status === "revoked" ? new Date() : existingSubscription.canceledAt,
              cancelAtPeriodEnd: false,
              periodStart: currentPeriodStart,
              periodEnd: currentPeriodEnd,
              daysWithService,
              priceId: null, // Clear priceId since free plan doesn't have one
            },
          });

          console.log("[Polar] Subscription updated to canceled/revoked and user set to free tier");
          return;
        }
      }

      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          cancelAtPeriodEnd,
        },
      });

      console.log("[Polar] Subscription updated successfully");
    } catch (error) {
      console.error("[Polar] Subscription update failed:", error);
      throw error;
    }
  },

  onSubscriptionActive: async (payload) => {
    const subscription = payload.data as any;
    console.log("[Polar] Subscription activated:", subscription.id);

    try {
      const subscriptionId = subscription.id;
      let existingSubscription = await db.subscription.findFirst({
        where: { subscriptionId },
      });

      // Create subscription if it doesn't exist (missed subscription.created event)
      if (!existingSubscription) {
        const userId = 
          subscription.metadata?.userId ||
          subscription.user_metadata?.userId || 
          subscription.customer?.externalId;
        
        if (!userId) {
          console.error("[Polar] Cannot create subscription - no user ID");
          return;
        }

        const priceId = 
          subscription.prices?.[0]?.id ||
          subscription.product?.prices?.[0]?.id;

        if (!priceId) {
          console.error("[Polar] Cannot create subscription - no price ID");
          return;
        }

        let plan = await db.plan.findFirst({
          where: {
            OR: [
              { monthlyPriceId: priceId },
              { yearlyPriceId: priceId },
            ],
          },
        });

        // Fallback: trim whitespace
        if (!plan) {
          const allPlans = await db.plan.findMany({
            where: {
              OR: [
                { monthlyPriceId: { not: null } },
                { yearlyPriceId: { not: null } },
              ],
            },
          });
          
          const matchedPlan = allPlans.find(
            (p) => 
              p.monthlyPriceId?.trim() === priceId.trim() || 
              p.yearlyPriceId?.trim() === priceId.trim()
          );
          
          if (matchedPlan) {
            plan = await db.plan.findUnique({
              where: { id: matchedPlan.id },
            });
          }
        }

        if (!plan) {
          console.error("[Polar] Plan not found for price:", priceId);
          return;
        }

        const customerId = subscription.customerId || subscription.customer_id || subscription.customer?.id;
        const periodStart = subscription.currentPeriodStart || subscription.current_period_start;
        const periodEnd = subscription.currentPeriodEnd || subscription.current_period_end;
        const recurringInterval = subscription.recurringInterval || subscription.recurring_interval;

        existingSubscription = await db.subscription.create({
          data: {
            referenceId: userId,
            planId: plan.id,
            priceId,
            subscriptionId,
            customerId,
            status: "active",
            provider: "polar",
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            billingInterval: recurringInterval === "year" ? "year" : "month",
            cancelAtPeriodEnd: false,
          },
        });

        console.log("[Polar] Subscription created from active event");
      } else {
        const periodStart = subscription.currentPeriodStart || subscription.current_period_start;
        const periodEnd = subscription.currentPeriodEnd || subscription.current_period_end;

        await db.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: "active",
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
          },
        });

        console.log("[Polar] Subscription activated successfully");
      }
    } catch (error) {
      console.error("[Polar] Subscription activation failed:", error);
      throw error;
    }
  },

  onSubscriptionCanceled: async (payload) => {
    const subscription = payload.data as any;
    console.log("[Polar] Subscription canceled:", subscription.id);

    try {
      const subscriptionId = subscription.id;
      const existingSubscription = await db.subscription.findFirst({
        where: { subscriptionId },
      });

      if (!existingSubscription) {
        console.error("[Polar] Subscription not found:", subscriptionId);
        return;
      }

      const canceledAt = subscription.canceledAt || subscription.canceled_at;

      // Find free plan to set user back to free tier
      const freePlan = await db.plan.findFirst({
        where: { planType: "free" },
      });

      if (!freePlan) {
        console.error("[Polar] Free plan not found");
        // Still update subscription status even if free plan not found
        await db.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: "canceled",
            canceledAt: canceledAt ? new Date(canceledAt) : new Date(),
            cancelAtPeriodEnd: true,
          },
        });
        return;
      }

      // Calculate free subscription period (20 years from now)
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 20);
      const daysWithService = Math.ceil(
        (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "active",
          planId: freePlan.id,
          canceledAt: canceledAt ? new Date(canceledAt) : new Date(),
          cancelAtPeriodEnd: false,
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          daysWithService,
          priceId: null, // Clear priceId since free plan doesn't have one
        },
      });

      console.log("[Polar] Subscription canceled and user set to free tier");
    } catch (error) {
      console.error("[Polar] Subscription cancellation failed:", error);
      throw error;
    }
  },

  onSubscriptionRevoked: async (payload) => {
    const subscription = payload.data as any;
    console.log("[Polar] Subscription revoked:", subscription.id);

    try {
      const subscriptionId = subscription.id;
      const existingSubscription = await db.subscription.findFirst({
        where: { subscriptionId },
      });

      if (!existingSubscription) {
        console.error("[Polar] Subscription not found:", subscriptionId);
        return;
      }

      // Find free plan to set user back to free tier
      const freePlan = await db.plan.findFirst({
        where: { planType: "free" },
      });

      if (!freePlan) {
        console.error("[Polar] Free plan not found");
        // Still update subscription status even if free plan not found
        await db.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: "revoked",
            canceledAt: new Date(),
          },
        });
        return;
      }

      // Calculate free subscription period (20 years from now)
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 20);
      const daysWithService = Math.ceil(
        (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "active",
          planId: freePlan.id,
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          daysWithService,
          priceId: null, // Clear priceId since free plan doesn't have one
        },
      });

      console.log("[Polar] Subscription revoked and user set to free tier");
    } catch (error) {
      console.error("[Polar] Subscription revocation failed:", error);
      throw error;
    }
  },
});
