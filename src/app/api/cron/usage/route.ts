import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { calculateUsagePeriod } from "@/lib/usage-period";

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

    await Promise.all(
      workspaces.map(async (workspace) => {
        const currentUsage = await db.usage.findFirst({
          where: {
            workspaceId: workspace.id,
            deletedAt: null, // Only get active usage records
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Check if it's time to create a new usage record
        // If no current usage exists, create one
        // If current usage period has ended, archive it and create a new one
        if (!currentUsage || now >= currentUsage.periodEnd) {
          // Archive the current usage record if it exists
          if (currentUsage) {
            await db.usage.update({
              where: {
                id: currentUsage.id,
              },
              data: {
                deletedAt: now,
              },
            });
          }

          // Calculate the next period using utility function
          const { periodStart, periodEnd } = calculateUsagePeriod(
            currentUsage?.periodEnd || null,
            now,
          );

          // Get current member count for this workspace
          const memberCount = await db.member.count({
            where: {
              workspaceId: workspace.id,
            },
          });

          // Create new usage record for the next period
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
        }
      }),
    );

    return NextResponse.json(
      { message: "Usage reset completed" },
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

// Only use signature verification if QStash keys are configured
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

export const POST = QSTASH_CURRENT_SIGNING_KEY && QSTASH_NEXT_SIGNING_KEY
  ? verifySignatureAppRouter(handler)
  : handler;
