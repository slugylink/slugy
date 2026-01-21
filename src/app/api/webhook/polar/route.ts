import { Webhooks } from "@polar-sh/nextjs";
import { db } from "@/server/db";
import { syncUserLimits, revalidateSubscriptionCache } from "@/lib/subscription/limits-sync";

// Polar webhook handler - processes subscription events from Polar payment provider
export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  // When a new order is created, link the customer ID to the user account
  onOrderCreated: async (payload) => {
    const order = payload.data as any;

    try {
      // Extract user ID from various possible metadata locations
      const userId = order.metadata?.userId;

      if (!userId) {
        console.error("[Polar] No user ID found in order metadata");
        return;
      }

      const customerId = order.customer_id;

      // Link Polar customer ID to our user account for future reference
      if (userId && customerId) {
        await db.user.update({
          where: { id: userId },
          data: { customerId },
        });
      }
    } catch (error) {
      console.error("[Polar] Failed to update user:", error);
    }
  },

  // When a new subscription is created, create/update subscription record in database
  onSubscriptionCreated: async (payload) => {
    const subscription = payload.data as any;

    try {
      // Extract user ID from subscription metadata
      const userId = subscription.metadata?.userId;

      if (!userId) {
        console.error("[Polar] No user ID found in subscription metadata");
        return;
      }

      // Extract price ID to determine which plan was purchased
      const priceId =
        subscription.prices?.[0]?.id ||
        subscription.product?.prices?.[0]?.id ||
        subscription.priceId;

      if (!priceId) {
        console.error("[Polar] No price ID found in subscription");
        return;
      }

      // Find matching plan in database by price ID (handles whitespace issues) / we can use redis alternatively as plans are static / aslo we can avoid db queries
      let plan = await db.plan.findFirst({
        where: {
          OR: [{ monthlyPriceId: priceId }, { yearlyPriceId: priceId }],
        },
      });

      // Fallback: if not found, search all plans and trim whitespace for comparison
      if (!plan) {
        const allPlans = await db.plan.findMany({
          where: {
            OR: [
              { monthlyPriceId: { not: null } },
              { yearlyPriceId: { not: null } },
            ],
          },
        });

        plan =
          allPlans.find(
            (p) =>
              p.monthlyPriceId?.trim() === priceId.trim() ||
              p.yearlyPriceId?.trim() === priceId.trim(),
          ) || null;
      }

      if (!plan) {
        console.error("[Polar] Plan not found for price ID:", priceId);
        console.error("[Polar] Product:", subscription.product?.name);
        return;
      }

      // Extract subscription details from Polar payload
      const subscriptionId = subscription.id;
      const customerId =
        subscription.customerId ||
        subscription.customer_id;
      const status = subscription.status;
      const periodStart =
        subscription.currentPeriodStart || subscription.current_period_start;
      const periodEnd =
        subscription.currentPeriodEnd || subscription.current_period_end;
      const recurringInterval =
        subscription.recurringInterval || subscription.recurring_interval;
      const cancelAtPeriodEnd =
        subscription.cancelAtPeriodEnd ||
        subscription.cancel_at_period_end ||
        false;

      // Create or update subscription record in database
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
          provider: "polar",
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          billingInterval: recurringInterval === "year" ? "year" : "month",
          cancelAtPeriodEnd,
        },
      });

      // Update user's customer ID if available
      if (customerId) {
        await db.user.update({
          where: { id: userId },
          data: { customerId },
        });
      }

      // Sync workspace and bio limits based on new plan
      await syncUserLimits(userId, plan.planType);

      // Revalidate subscription cache
      await revalidateSubscriptionCache();
    } catch (error) {
      console.error("[Polar] Subscription creation failed:", error);
      throw error;
    }
  },

  // When subscription details change (status, billing period, etc.)
  onSubscriptionUpdated: async (payload) => {
    const subscription = payload.data as any;

    try {
      // Find existing subscription by subscription ID
      const subscriptionId = subscription.id;
      let existingSubscription = await db.subscription.findFirst({
        where: { subscriptionId },
      });

      // If not found by ID, try finding by customer ID (handles edge cases)
      if (!existingSubscription) {
        const customerId =
          subscription.customerId ||
          subscription.customer_id ||
          subscription.customer?.id;
        if (customerId) {
          existingSubscription = await db.subscription.findFirst({
            where: { customerId },
          });
          if (existingSubscription) {
            // Link the subscription ID to the found record
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

      // Extract updated subscription details
      const periodStart =
        subscription.currentPeriodStart || subscription.current_period_start;
      const periodEnd =
        subscription.currentPeriodEnd || subscription.current_period_end;
      const cancelAtPeriodEnd =
        subscription.cancelAtPeriodEnd ||
        subscription.cancel_at_period_end ||
        false;
      const status = subscription.status;

      // Handle cancellation/revocation: downgrade user to free plan
      if (status === "canceled" || status === "revoked") {
        const freePlan = await db.plan.findFirst({
          where: { planType: "free" },
        });

        if (freePlan) {
          // Set free plan period to 1 month (monthly billing cycle)
          const currentPeriodStart = new Date();
          const currentPeriodEnd = new Date(currentPeriodStart);
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
          const daysWithService = Math.ceil(
            (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          // Update subscription to free plan
          await db.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              status: "active",
              planId: freePlan.id,
              canceledAt:
                status === "canceled" || status === "revoked"
                  ? new Date()
                  : existingSubscription.canceledAt,
              cancelAtPeriodEnd: false,
              periodStart: currentPeriodStart,
              periodEnd: currentPeriodEnd,
              billingInterval: "month", // Free plan always has monthly billing
              daysWithService,
              priceId: null, // Clear priceId since free plan doesn't have one
            },
          });

          // Downgrade user limits to free tier
          await syncUserLimits(existingSubscription.referenceId, "free");

          // Revalidate subscription cache
          await revalidateSubscriptionCache();

          return;
        }
      }

      // Check if plan changed (upgrade/downgrade)
      const priceId =
        subscription.prices?.[0]?.id ||
        subscription.product?.prices?.[0]?.id ||
        subscription.priceId;

      let updatedPlan = null;
      if (priceId && priceId !== existingSubscription.priceId) {
        // Find new plan by price ID
        updatedPlan = await db.plan.findFirst({
          where: {
            OR: [{ monthlyPriceId: priceId }, { yearlyPriceId: priceId }],
          },
        });

        // Fallback: search with whitespace trim
        if (!updatedPlan) {
          const allPlans = await db.plan.findMany({
            where: {
              OR: [
                { monthlyPriceId: { not: null } },
                { yearlyPriceId: { not: null } },
              ],
            },
          });
          updatedPlan =
            allPlans.find(
              (p) =>
                p.monthlyPriceId?.trim() === priceId.trim() ||
                p.yearlyPriceId?.trim() === priceId.trim(),
            ) || null;
        }
      }

      // Build update data object - only include dates if they're valid
      const updateData: any = {
        ...(updatedPlan && { planId: updatedPlan.id, priceId }),
        status,
        cancelAtPeriodEnd,
      };

      // Only update period dates if they're provided and valid
      if (periodStart) {
        updateData.periodStart = new Date(periodStart);
      }
      if (periodEnd) {
        updateData.periodEnd = new Date(periodEnd);
      }

      // Update subscription with new period dates and status
      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: updateData,
      });

      // If plan changed, sync limits
      if (updatedPlan) {
        await syncUserLimits(existingSubscription.referenceId, updatedPlan.planType);
      }

      // Revalidate subscription cache
      await revalidateSubscriptionCache();
    } catch (error) {
      console.error("[Polar] Subscription update failed:", error);
      throw error;
    }
  },

  // When subscription becomes active (payment successful, trial started, etc.)
  onSubscriptionActive: async (payload) => {
    const subscription = payload.data as any;

    try {
      const subscriptionId = subscription.id;
      let existingSubscription = await db.subscription.findFirst({
        where: { subscriptionId },
      });

      // Handle case where subscription.created event was missed - create it now
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
          subscription.prices?.[0]?.id || subscription.product?.prices?.[0]?.id;

        if (!priceId) {
          console.error("[Polar] Cannot create subscription - no price ID");
          return;
        }

        // Find plan by price ID (same logic as subscription.created)
        let plan = await db.plan.findFirst({
          where: {
            OR: [{ monthlyPriceId: priceId }, { yearlyPriceId: priceId }],
          },
        });

        // Fallback: search all plans and trim whitespace for comparison
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
              p.yearlyPriceId?.trim() === priceId.trim(),
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

        // Extract subscription details and create new record
        const customerId =
          subscription.customerId ||
          subscription.customer_id ||
          subscription.customer?.id;
        const periodStart =
          subscription.currentPeriodStart || subscription.current_period_start;
        const periodEnd =
          subscription.currentPeriodEnd || subscription.current_period_end;
        const recurringInterval =
          subscription.recurringInterval || subscription.recurring_interval;

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

        // Sync workspace and bio limits based on new plan
        await syncUserLimits(userId, plan.planType);

        // Revalidate subscription cache
        await revalidateSubscriptionCache();
      } else {
        // Subscription exists - just update status and period dates
        const periodStart =
          subscription.currentPeriodStart || subscription.current_period_start;
        const periodEnd =
          subscription.currentPeriodEnd || subscription.current_period_end;

        // Build update data - only include dates if they're valid
        const updateData: any = {
          status: "active",
        };

        if (periodStart) {
          updateData.periodStart = new Date(periodStart);
        }
        if (periodEnd) {
          updateData.periodEnd = new Date(periodEnd);
        }

        await db.subscription.update({
          where: { id: existingSubscription.id },
          data: updateData,
        });

        // Revalidate subscription cache
        await revalidateSubscriptionCache();
      }
    } catch (error) {
      console.error("[Polar] Subscription activation failed:", error);
      throw error;
    }
  },

  // When subscription is canceled by user - keep access until period ends
  onSubscriptionCanceled: async (payload) => {
    const subscription = payload.data as any;

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

      // IMPORTANT: User keeps Pro access until period ends
      // Mark subscription for cancellation at period end (don't downgrade immediately)
      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "active", // Keep active status until period ends
          canceledAt: canceledAt ? new Date(canceledAt) : new Date(),
          cancelAtPeriodEnd: true, // Mark for cancellation at period end
        },
      });

      // DON'T downgrade limits yet - user paid for full period
      // DON'T change plan yet - user keeps Pro until period ends
      // The subscription-renewal cron job will handle downgrade when period ends

      // Revalidate subscription cache
      await revalidateSubscriptionCache();
    } catch (error) {
      console.error("[Polar] Subscription cancellation failed:", error);
      throw error;
    }
  },

  // When subscription is revoked (payment failed, fraud, etc.) - downgrade to free plan
  onSubscriptionRevoked: async (payload) => {
    const subscription = payload.data as any;

    try {
      const subscriptionId = subscription.id;
      const existingSubscription = await db.subscription.findFirst({
        where: { subscriptionId },
      });

      if (!existingSubscription) {
        console.error("[Polar] Subscription not found:", subscriptionId);
        return;
      }

      // Find free plan to downgrade user to free tier
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

      // Set free plan period to 1 month (monthly billing cycle)
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      const daysWithService = Math.ceil(
        (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Update subscription to free plan
      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: "active",
          planId: freePlan.id,
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          billingInterval: "month", // Free plan always has monthly billing
          daysWithService,
          priceId: null, // Clear priceId since free plan doesn't have one
        },
      });

      // Downgrade user limits to free tier
      await syncUserLimits(existingSubscription.referenceId, "free");

      // Revalidate subscription cache
      await revalidateSubscriptionCache();
    } catch (error) {
      console.error("[Polar] Subscription revocation failed:", error);
      throw error;
    }
  },
});
