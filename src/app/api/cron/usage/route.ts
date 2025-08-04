import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { calculateUsagePeriod, isUsagePeriodExpired } from "@/lib/usage-period";

async function handler() {
  try {
    const workspaces = await db.workspace.findMany({
      include: {
        members: true,
      },
    });

    if (workspaces.length === 0) {
      return NextResponse.json(
        { message: "No workspaces found" },
        { status: 200 },
      );
    }

    const now = new Date();
    let processedCount = 0;
    let resetCount = 0;

    await Promise.all(
      workspaces.map(async (workspace) => {
        // Find the latest active usage record
        const currentUsage = await db.usage.findFirst({
          where: {
            workspaceId: workspace.id,
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        processedCount++;

        if (currentUsage && isUsagePeriodExpired(currentUsage.periodEnd, now)) {
          // Archive old usage record
          await db.usage.update({
            where: { id: currentUsage.id },
            data: { deletedAt: now },
          });

          // Calculate next period, catching up if delayed
          const { periodStart, periodEnd } = calculateUsagePeriod(
            currentUsage.periodEnd,
            now,
          );

          // Count current members
          const memberCount = await db.member.count({
            where: { workspaceId: workspace.id },
          });

          // Create new usage record
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
        } else if (!currentUsage) {
          // New workspace with no usage records yet
          const { periodStart, periodEnd } = calculateUsagePeriod(null, now);

          const memberCount = await db.member.count({
            where: { workspaceId: workspace.id },
          });

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
      }),
    );

    return NextResponse.json(
      {
        message: "Usage cron job completed",
        processed: processedCount,
        reset: resetCount,
        timestamp: now.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in usage cron job:", error);
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
