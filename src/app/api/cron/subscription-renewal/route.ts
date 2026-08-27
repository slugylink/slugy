import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { downgradeToBasicLimits } from "@/lib/subscription/basic-entitlement";
import { revalidateSubscriptionCache } from "@/lib/subscription/limits-sync";

const BATCH_SIZE = 100;

/**
 * Ends canceled Pro subscriptions whose paid period has elapsed.
 * Downgrades limits to Basic so unpaid Pro caps cannot linger.
 */
async function handler() {
  try {
    console.log(
      "[Subscription Renewal] Starting subscription renewal cron job",
    );

    const now = new Date();
    let expiredTotal = 0;
    let cursor: string | undefined;

    // Cursor pagination — skip+mutate would skip rows as the result set shrinks.
    for (;;) {
      const batch = await db.subscription.findMany({
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        where: {
          status: "active",
          periodEnd: { lte: now },
          cancelAtPeriodEnd: true,
        },
        orderBy: { id: "asc" },
        select: {
          id: true,
          referenceId: true,
          canceledAt: true,
        },
      });

      if (batch.length === 0) break;

      for (const subscription of batch) {
        await downgradeToBasicLimits({
          subscriptionId: subscription.id,
          canceledAt: subscription.canceledAt ?? now,
        });
        expiredTotal++;
        console.log(
          `[Subscription Renewal] Ended subscription ${subscription.id} for user ${subscription.referenceId}`,
        );
      }

      cursor = batch[batch.length - 1]?.id;
      if (batch.length < BATCH_SIZE) break;
    }

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

const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

export const POST =
  QSTASH_CURRENT_SIGNING_KEY && QSTASH_NEXT_SIGNING_KEY
    ? verifySignatureAppRouter(handler)
    : handler;
