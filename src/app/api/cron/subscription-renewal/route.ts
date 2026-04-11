import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import {
  syncUserLimits,
  revalidateSubscriptionCache,
} from "@/lib/subscription/limits-sync";

const BATCH_SIZE = 100;

/**
 * Process subscription renewals and cancellations
 * - Canceled subscriptions: End access when paid period ends
 * - Active subscriptions: Handled by Polar webhooks
 */
async function processBatch(subscriptions: any[]) {
  const now = new Date();

  return db.$transaction(async (tx) => {
    let expiredCount = 0;

    for (const subscription of subscriptions) {
      // Only process if period has ended
      if (subscription.periodEnd <= now) {
        if (subscription.cancelAtPeriodEnd) {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "inactive",
              cancelAtPeriodEnd: false,
              canceledAt: subscription.canceledAt ?? now,
            },
          });

          expiredCount++;
          console.log(
            `[Subscription Renewal] Ended subscription ${subscription.id} for user ${subscription.referenceId}`,
          );
        }
      }
    }

    return { expiredCount };
  });
}

async function handler() {
  try {
    console.log(
      "[Subscription Renewal] Starting subscription renewal cron job",
    );

    const now = new Date();

    // Process subscriptions that need to be ended
    // 1. Canceled paid subscriptions that reached period end
    const totalSubscriptions = await db.subscription.count({
      where: {
        status: "active",
        periodEnd: {
          lte: now, // Period has ended
        },
        cancelAtPeriodEnd: true, // Canceled paid plans ready for deactivation
      },
    });

    if (totalSubscriptions === 0) {
      console.log("[Subscription Renewal] No subscriptions need processing");
      return NextResponse.json(
        { message: "No subscriptions need processing" },
        { status: 200 },
      );
    }

    let expiredTotal = 0;

    for (let skip = 0; skip < totalSubscriptions; skip += BATCH_SIZE) {
      const batch = await db.subscription.findMany({
        skip,
        take: BATCH_SIZE,
        where: {
          status: "active",
          periodEnd: {
            lte: now,
          },
          cancelAtPeriodEnd: true,
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

      const { expiredCount } = await processBatch(batch);
      expiredTotal += expiredCount;
    }

    // Revalidate caches after processing
    await revalidateSubscriptionCache();

    console.log(`[Subscription Renewal] Completed - Ended: ${expiredTotal}`);

    return NextResponse.json({
      message: "Subscription renewal cron job completed",
      expired: expiredTotal,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Subscription Renewal] Error in cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
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
