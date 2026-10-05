import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { withCronAuth } from "@/lib/cron-auth";

// Webhook deliveries carry customer PII in their payloads — retain debugging
// value without indefinite storage.
const SUCCESS_RETENTION_DAYS = 30;
const FAILED_RETENTION_DAYS = 90;

async function handler() {
  try {
    const now = Date.now();
    const [success, failed] = await Promise.all([
      db.webhookDelivery.deleteMany({
        where: {
          status: "success",
          createdAt: {
            lt: new Date(now - SUCCESS_RETENTION_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      }),
      db.webhookDelivery.deleteMany({
        where: {
          status: "failed",
          createdAt: {
            lt: new Date(now - FAILED_RETENTION_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);
    return NextResponse.json({
      message: "Webhook delivery retention sweep completed",
      purgedSuccess: success.count,
      purgedFailed: failed.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[webhook-deliveries cron]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
// Vercel Cron invokes GET; QStash invokes POST. Both share the same auth.
export const GET = withCronAuth(handler);
