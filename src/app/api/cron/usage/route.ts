import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { calculateUsagePeriod, isUsagePeriodExpired } from "@/lib/usage-period";

const BATCH_SIZE = 100;

type BatchWorkspace = { id: string; userId: string };

async function processBatch(workspaces: BatchWorkspace[]) {
  const now = new Date();

  const workspaceIds = workspaces.map((w) => w.id);

  const members = await db.member.findMany({
    where: { workspaceId: { in: workspaceIds } },
    select: { workspaceId: true },
  });

  const memberCountMap = new Map<string, number>();
  for (const member of members) {
    const count = memberCountMap.get(member.workspaceId) ?? 0;
    memberCountMap.set(member.workspaceId, count + 1);
  }

  const latestUsagesRaw = await db.usage.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      deletedAt: null,
    },
    orderBy: [{ workspaceId: "asc" }, { createdAt: "desc" }],
  });

  const latestUsageMap = new Map<string, (typeof latestUsagesRaw)[number]>();
  for (const usage of latestUsagesRaw) {
    const wid = usage.workspaceId;
    if (!wid) continue;
    if (!latestUsageMap.has(wid)) {
      latestUsageMap.set(wid, usage);
    }
  }

  let resetCount = 0;
  let processedCount = 0;
  let failedCount = 0;
  const failures: Array<{ workspaceId: string; error: string }> = [];

  for (const workspace of workspaces) {
    processedCount++;
    const currentUsage = latestUsageMap.get(workspace.id);
    const memberCount = memberCountMap.get(workspace.id) ?? 0;

    try {
      if (currentUsage && isUsagePeriodExpired(currentUsage.periodEnd, now)) {
        await db.$transaction(async (tx) => {
          await tx.usage.update({
            where: { id: currentUsage.id },
            data: { deletedAt: now },
          });

          const { periodStart, periodEnd } = calculateUsagePeriod(
            currentUsage.periodEnd,
            now,
          );

          await tx.usage.create({
            data: {
              userId: workspace.userId,
              workspaceId: workspace.id,
              linksCreated: 0,
              clicksTracked: 0,
              addedUsers: memberCount,
              periodStart,
              periodEnd,
            },
          });
        });

        resetCount++;
      } else if (!currentUsage) {
        const { periodStart, periodEnd } = calculateUsagePeriod(null, now);

        await db.usage.create({
          data: {
            userId: workspace.userId,
            workspaceId: workspace.id,
            linksCreated: 0,
            clicksTracked: 0,
            addedUsers: memberCount,
            periodStart,
            periodEnd,
          },
        });

        resetCount++;
      }
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

// Only use signature verification if QStASH keys configured
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

export const POST =
  QSTASH_CURRENT_SIGNING_KEY && QSTASH_NEXT_SIGNING_KEY
    ? verifySignatureAppRouter(handler)
    : handler;
