import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";
import { withCronAuth } from "@/lib/cron-auth";

const BATCH_SIZE = 100;

type BatchWorkspace = { id: string; userId: string };

async function processBatch(workspaces: BatchWorkspace[]) {
  const now = new Date();

  let resetCount = 0;
  let processedCount = 0;
  let failedCount = 0;
  const failures: Array<{ workspaceId: string; error: string }> = [];

  for (const workspace of workspaces) {
    processedCount++;
    try {
      const usage = await ensureCurrentUsageRecord(db, {
        workspaceId: workspace.id,
        userId: workspace.userId,
        now,
      });
      if (usage.createdAt >= now) resetCount++;
    } catch (error) {
      failedCount++;
      const message = error instanceof Error ? error.message : "Unknown error";
      failures.push({ workspaceId: workspace.id, error: message });
      console.error("[Usage Cron] Failed workspace:", {
        workspaceId: workspace.id,
        userId: workspace.userId,
        error: message,
      });
    }
  }

  return { resetCount, processedCount, failedCount, failures };
}

async function handler() {
  try {
    const totalWorkspaces = await db.workspace.count();

    if (totalWorkspaces === 0) {
      return NextResponse.json(
        { message: "No workspaces found" },
        { status: 200 },
      );
    }

    let processedTotal = 0;
    let resetTotal = 0;
    let failedTotal = 0;
    const failures: Array<{ workspaceId: string; error: string }> = [];

    for (let skip = 0; skip < totalWorkspaces; skip += BATCH_SIZE) {
      const batch = await db.workspace.findMany({
        skip,
        take: BATCH_SIZE,
        select: {
          id: true,
          userId: true,
        },
      });

      if (batch.length === 0) break;

      const {
        resetCount,
        processedCount,
        failedCount,
        failures: batchFailures,
      } = await processBatch(batch);
      processedTotal += processedCount;
      resetTotal += resetCount;
      failedTotal += failedCount;
      failures.push(...batchFailures);
    }

    const hasFailures = failedTotal > 0;

    return NextResponse.json(
      {
        message: "Usage cron job completed",
        processed: processedTotal,
        reset: resetTotal,
        failed: failedTotal,
        failures: failures.slice(0, 20),
        timestamp: new Date().toISOString(),
      },
      { status: hasFailures ? 207 : 200 },
    );
  } catch (error) {
    console.error("Error in usage cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);
// Vercel Cron invokes GET; QStash invokes POST. Both share the same auth.
export const GET = withCronAuth(handler);
