import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { calculateUsagePeriod, isUsagePeriodExpired } from "@/lib/usage-period";

const BATCH_SIZE = 100;

type BatchWorkspace = { id: string; userId: string };

async function processBatch(workspaces: BatchWorkspace[]) {
  const now = new Date();

  const workspaceIds = workspaces.map((w) => w.id);

  const memberCountsRaw = await db.member.groupBy({
    by: ["workspaceId"],
    where: { workspaceId: { in: workspaceIds } },
    _count: { id: true },
  });

  const memberCountMap = new Map<string, number>();
  for (const m of memberCountsRaw) {
    if (m.workspaceId) {
      memberCountMap.set(m.workspaceId, m._count.id);
    }
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

  return db.$transaction(async (tx) => {
    let resetCount = 0;
    let processedCount = 0;

    for (const workspace of workspaces) {
      processedCount++;
      const currentUsage = latestUsageMap.get(workspace.id);
      const memberCount = memberCountMap.get(workspace.id) ?? 0;

      if (currentUsage && isUsagePeriodExpired(currentUsage.periodEnd, now)) {
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

        resetCount++;
      } else if (!currentUsage) {
        const { periodStart, periodEnd } = calculateUsagePeriod(null, now);

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

        resetCount++;
      }
    }

    return { resetCount, processedCount };
  });
}

async function handler() {
  try {
    const totalWorkspaces = await db.workspace.count();

    if (totalWorkspaces === 0) {
      return NextResponse.json({ message: "No workspaces found" }, { status: 200 });
    }

    let processedTotal = 0;
    let resetTotal = 0;

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

      const { resetCount, processedCount } = await processBatch(batch);
      processedTotal += processedCount;
      resetTotal += resetCount;
    }

    return NextResponse.json({
      message: "Usage cron job completed",
      processed: processedTotal,
      reset: resetTotal,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in usage cron job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Only use signature verification if QStASH keys configured
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

export const POST =
  QSTASH_CURRENT_SIGNING_KEY && QSTASH_NEXT_SIGNING_KEY
    ? verifySignatureAppRouter(handler)
    : handler;
