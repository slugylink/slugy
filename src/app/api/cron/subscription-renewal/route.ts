import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { syncUserLimits, revalidateSubscriptionCache } from "@/lib/subscription/limits-sync";

const BATCH_SIZE = 100;

/**
 * Process subscription renewals and cancellations
 * - Free plans: Renew monthly (1 month period)
 * - Canceled paid plans: Downgrade to free when period ends
 * - Active paid plans: Handled by Polar webhooks
 */
async function processBatch(subscriptions: any[]) {
  const now = new Date();

  return db.$transaction(async (tx) => {
    let renewedCount = 0;
    let downgradedCount = 0;

    for (const subscription of subscriptions) {
      // Only process if period has ended
      if (subscription.periodEnd <= now) {
        // Handle canceled subscriptions - downgrade to free plan
        if (subscription.cancelAtPeriodEnd) {
          const freePlan = await tx.plan.findFirst({
            where: { planType: "free" },
          });

          if (freePlan) {
            const newPeriodStart = new Date(now);
            const newPeriodEnd = new Date(now);
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

            const daysWithService = Math.ceil(
              (newPeriodEnd.getTime() - newPeriodStart.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            // Downgrade to free plan
            await tx.subscription.update({
              where: { id: subscription.id },
              data: {
                planId: freePlan.id,
                status: "active",
                cancelAtPeriodEnd: false,
                periodStart: newPeriodStart,
                periodEnd: newPeriodEnd,
                billingInterval: "month",
                daysWithService,
                priceId: null,
              },
            });

            // Downgrade user limits to free tier
            await syncUserLimits(subscription.referenceId, "free");

            downgradedCount++;
            console.log(
              `[Subscription Renewal] Downgraded canceled subscription ${subscription.id} to free plan for user ${subscription.referenceId}`
            );
          }
        } 
        // Handle free plan renewals
        else if (subscription.plan.planType === "free") {
          const newPeriodStart = new Date(now);
          const newPeriodEnd = new Date(now);

          // Set period based on billing interval
          if (subscription.billingInterval === "year") {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
          } else {
            // Default to monthly billing
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
          }

          const daysWithService = Math.ceil(
            (newPeriodEnd.getTime() - newPeriodStart.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              periodStart: newPeriodStart,
              periodEnd: newPeriodEnd,
              daysWithService,
            },
          });

          renewedCount++;
          console.log(
            `[Subscription Renewal] Renewed free subscription ${subscription.id} for user ${subscription.referenceId}`
          );
        }
      }
    }

    return { renewedCount, downgradedCount };
  });
}

async function handler() {
  try {
    console.log("[Subscription Renewal] Starting subscription renewal cron job");

    const now = new Date();

    // Process subscriptions that need renewal or cancellation
    // 1. Free plans that need renewal
    // 2. Canceled subscriptions that reached period end (need downgrade)
    const totalSubscriptions = await db.subscription.count({
      where: {
        status: "active",
        periodEnd: {
          lte: now, // Period has ended
        },
        OR: [
          {
            plan: {
              planType: "free",
            },
          },
          {
            cancelAtPeriodEnd: true, // Canceled paid plans ready for downgrade
          },
        ],
      },
    });

    if (totalSubscriptions === 0) {
      console.log("[Subscription Renewal] No subscriptions need processing");
      return NextResponse.json(
        { message: "No subscriptions need processing" },
        { status: 200 }
      );
    }

    let renewedTotal = 0;
    let downgradedTotal = 0;

    for (let skip = 0; skip < totalSubscriptions; skip += BATCH_SIZE) {
      const batch = await db.subscription.findMany({
        skip,
        take: BATCH_SIZE,
        where: {
          status: "active",
          periodEnd: {
            lte: now,
          },
          OR: [
            {
              plan: {
                planType: "free",
              },
            },
            {
              cancelAtPeriodEnd: true,
            },
          ],
        },
        include: {
          plan: {
            select: {
              planType: true,
            },
          },
        },
      });

      if (batch.length === 0) break;

      const { renewedCount, downgradedCount } = await processBatch(batch);
      renewedTotal += renewedCount;
      downgradedTotal += downgradedCount;
    }

    // Revalidate caches after processing
    await revalidateSubscriptionCache();

    console.log(
      `[Subscription Renewal] Completed - Renewed: ${renewedTotal}, Downgraded: ${downgradedTotal}`
    );

    return NextResponse.json({
      message: "Subscription renewal cron job completed",
      renewed: renewedTotal,
      downgraded: downgradedTotal,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Subscription Renewal] Error in cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Only use signature verification if QStash keys configured
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

export const POST =
  QSTASH_CURRENT_SIGNING_KEY && QSTASH_NEXT_SIGNING_KEY
    ? verifySignatureAppRouter(handler)
    : handler;
