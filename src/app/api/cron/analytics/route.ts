import { redis } from "@/lib/redis";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import type { RedisAnalyticsEvent } from "@/lib/cache-utils/redis-analytics";

// Batch size for processing Redis events
const BATCH_SIZE = 1000;
const PROCESSING_WINDOW_HOURS = 4; // Process events from last 4 hours

async function getAllAnalyticsKeys(): Promise<string[]> {
  try {
    const workspaceKeys = await redis.keys("analytics:zset:ws:*");
    const slugKeys = await redis.keys("analytics:zset:wslug:*");
    return [...workspaceKeys, ...slugKeys];
  } catch (err) {
    console.error("Failed to get analytics keys:", err);
    return [];
  }
}

async function getEventsFromKey(key: string, fromTs: number, toTs: number): Promise<RedisAnalyticsEvent[]> {
  try {
    const raw = await redis.zrange(key, fromTs, toTs, { byScore: true });
    const items = raw as unknown as Array<string | { member: string; score: number } | RedisAnalyticsEvent>;
    const events: RedisAnalyticsEvent[] = [];
    
    for (const item of items) {
      if (typeof item === "string") {
        try {
          events.push(JSON.parse(item) as RedisAnalyticsEvent);
        } catch {
          // ignore malformed
        }
      } else if (item && typeof item === "object") {
        if ("member" in item && typeof (item as { member: string; score: number }).member === "string") {
          try {
            events.push(JSON.parse((item as { member: string; score: number }).member) as RedisAnalyticsEvent);
          } catch {
            // ignore malformed
          }
        } else {
          events.push(item as RedisAnalyticsEvent);
        }
      }
    }
    return events;
  } catch (err) {
    console.error(`Failed to get events from key ${key}:`, err);
    return [];
  }
}

async function processAnalyticsBatch(events: RedisAnalyticsEvent[]): Promise<{
  success: number;
  failed: number;
  skipped: number;
}> {
  let success = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Group events by workspace for batch processing
    const workspaceGroups = new Map<string, RedisAnalyticsEvent[]>();
    for (const event of events) {
      const group = workspaceGroups.get(event.workspaceId) || [];
      group.push(event);
      workspaceGroups.set(event.workspaceId, group);
    }

    // Process each workspace batch
    for (const [workspaceId, workspaceEvents] of workspaceGroups) {
      try {
        // Get usage record for this workspace
        const usageRecord = await db.usage.findFirst({
          where: { workspaceId },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });

        if (!usageRecord) {
          console.warn(`No usage record found for workspace ${workspaceId}`);
          skipped += workspaceEvents.length;
          continue;
        }

        // Prepare batch operations
        const analyticsInserts = workspaceEvents.map(event => ({
          linkId: event.linkId,
          clickedAt: new Date(event.ts),
          ipAddress: event.ip?.substring(0, 45),
          country: event.country?.substring(0, 100),
          city: event.city?.substring(0, 100),
          continent: event.continent?.substring(0, 50),
          browser: event.browser,
          os: event.os,
          device: event.device,
          referer: event.referer?.substring(0, 500) || "Direct",
        }));

        // Get unique links to update click counts
        const linkUpdates = new Map<string, number>();
        for (const event of workspaceEvents) {
          const current = linkUpdates.get(event.slug) || 0;
          linkUpdates.set(event.slug, current + 1);
        }

        // Execute batch transaction
        await db.$transaction(async (tx) => {
          // Insert analytics records
          await tx.analytics.createMany({
            data: analyticsInserts,
            skipDuplicates: true, // Skip if duplicate based on unique constraints
          });

          // Update link click counts
          for (const [slug, increment] of linkUpdates) {
            await tx.link.updateMany({
              where: { slug },
              data: {
                clicks: { increment },
                lastClicked: new Date(),
              },
            });
          }

          // Update usage record
          await tx.usage.update({
            where: { id: usageRecord.id },
            data: {
              clicksTracked: { increment: workspaceEvents.length },
            },
          });
        });

        success += workspaceEvents.length;
      } catch (err) {
        console.error(`Failed to process workspace ${workspaceId}:`, err);
        failed += workspaceEvents.length;
      }
    }
  } catch (err) {
    console.error("Batch processing failed:", err);
    failed += events.length;
  }

  return { success, failed, skipped };
}

async function removeProcessedEvents(keys: string[], fromTs: number, toTs: number): Promise<void> {
  try {
    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.zremrangebyscore(key, fromTs, toTs);
    }
    await pipeline.exec();
  } catch (err) {
    console.error("Failed to remove processed events:", err);
  }
}

export const POST = verifySignatureAppRouter(async (req: NextRequest) => {
  try {
    console.log("Starting analytics batch processing...");
    
    const now = Date.now();
    const fromTs = now - (PROCESSING_WINDOW_HOURS * 60 * 60 * 1000);
    const toTs = now;

    // Get all analytics keys
    const keys = await getAllAnalyticsKeys();
    console.log(`Found ${keys.length} analytics keys to process`);

    if (keys.length === 0) {
      return NextResponse.json({ 
        message: "No analytics keys found",
        processed: { success: 0, failed: 0, skipped: 0 }
      });
    }

    // Collect all events from all keys
    const allEvents: RedisAnalyticsEvent[] = [];
    for (const key of keys) {
      const events = await getEventsFromKey(key, fromTs, toTs);
      allEvents.push(...events);
    }

    console.log(`Collected ${allEvents.length} events to process`);

    if (allEvents.length === 0) {
      return NextResponse.json({ 
        message: "No events to process",
        processed: { success: 0, failed: 0, skipped: 0 }
      });
    }

    // Process events in batches
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
      const batch = allEvents.slice(i, i + BATCH_SIZE);
      const result = await processAnalyticsBatch(batch);
      
      totalSuccess += result.success;
      totalFailed += result.failed;
      totalSkipped += result.skipped;

      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.success} success, ${result.failed} failed, ${result.skipped} skipped`);
    }

    // Remove processed events from Redis
    await removeProcessedEvents(keys, fromTs, toTs);

    console.log(`Analytics batch processing completed: ${totalSuccess} success, ${totalFailed} failed, ${totalSkipped} skipped`);

    return NextResponse.json({
      message: "Analytics batch processing completed",
      processed: {
        success: totalSuccess,
        failed: totalFailed,
        skipped: totalSkipped,
      },
      window: {
        from: new Date(fromTs).toISOString(),
        to: new Date(toTs).toISOString(),
      },
    });
  } catch (error) {
    console.error("Analytics batch processing error:", error);
    return NextResponse.json(
      { error: "Batch processing failed" },
      { status: 500 }
    );
  }
});