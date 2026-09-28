import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { z } from "zod";
import {
  clearProcessedAnalyticsEvents,
  getCachedAnalyticsCount,
  peekAnalyticsEventKeys,
  readAnalyticsEventsByKeys,
  type CachedAnalyticsData,
  type KeyedAnalyticsEvent,
} from "@/lib/cache-utils/analytics-cache";
import { withCronAuth } from "@/lib/cron-auth";

const BATCH_PROCESS = 5000;
const MAX_PROCESS_ALL = 20000; // Max events to process in one go

/**
 * Stores one batch idempotently. Returns the stored events' index keys so
 * the caller removes exactly what landed. Retries are safe: already-stored
 * clickIds are skipped (Analytics has no unique constraint on clickId, so
 * `skipDuplicates` alone is a no-op — this explicit check is the dedupe).
 */
async function storeBatch(
  batch: CachedAnalyticsData[],
  batchKeys: string[],
): Promise<{ count: number; keys: string[] }> {
  return db.$transaction(
    async (tx) => {
      // Only events for existing, non-deleted links.
      const linkIds = [...new Set(batch.map((event) => event.linkId))];
      const existingLinks = await tx.link.findMany({
        where: { id: { in: linkIds }, deletedAt: null },
        select: { id: true },
      });
      const existingLinkIds = new Set(existingLinks.map((link) => link.id));

      const indexed = batch
        .map((event, i) => ({ event, key: batchKeys[i] as string }))
        .filter(({ event }) => existingLinkIds.has(event.linkId));

      if (indexed.length !== batch.length) {
        console.warn(
          `Skipped ${batch.length - indexed.length} events with non-existent or deleted link IDs`,
        );
      }

      // Idempotency: skip clickIds already stored (retry-safe without a
      // DB unique constraint; add @@unique([clickId]) to skip this read).
      const clickIds = [
        ...new Set(
          indexed.map(({ event }) => event.clickId).filter(Boolean) as string[],
        ),
      ];
      const alreadyStored = new Set<string>();
      if (clickIds.length > 0) {
        const rows = await tx.analytics.findMany({
          where: { clickId: { in: clickIds } },
          select: { clickId: true },
        });
        for (const row of rows) {
          if (row.clickId) alreadyStored.add(row.clickId);
        }
      }

      const fresh = indexed.filter(
        ({ event }) => !event.clickId || !alreadyStored.has(event.clickId),
      );

      if (fresh.length > 0) {
        await tx.analytics.createMany({
          data: fresh.map(({ event }) => ({
            linkId: event.linkId,
            clickedAt: new Date(event.timestamp),
            clickId: event.clickId,
            ipAddress: event.ipAddress?.substring(0, 45),
            country: event.country?.substring(0, 100),
            city: event.city?.substring(0, 100),
            region: event.region?.substring(0, 100),
            continent: event.continent?.substring(0, 50),
            browser: event.browser,
            os: event.os,
            device: event.device,
            trigger: event.trigger,
            referer: event.referer?.substring(0, 500) || "Direct",
            utm_source: event.utm_source,
            utm_medium: event.utm_medium,
            utm_campaign: event.utm_campaign,
            utm_term: event.utm_term,
            utm_content: event.utm_content,
          })),
        });
      }

      return { count: fresh.length, keys: fresh.map(({ key }) => key) };
    },
    {
      timeout: 60000, // 60 second timeout for batch
      maxWait: 15000, // Max wait for connection
    },
  );
}

// Input validation schema for batch processing
const batchProcessSchema = z.object({
  maxBatchSize: z
    .number()
    .min(1)
    .max(MAX_PROCESS_ALL)
    .optional()
    .default(BATCH_PROCESS),
  dryRun: z.boolean().optional().default(false),
  processAll: z.boolean().optional().default(false), // New option to process all cached events
});

async function handler(req: NextRequest) {
  try {
    // Safely parse request body with error handling
    let body;
    try {
      const text = await req.text();
      if (!text || text.trim() === "") {
        body = {}; // Use default values if body is empty
      } else {
        body = JSON.parse(text);
      }
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError);
      // Use default values if JSON parsing fails
      body = {};
    }

    const validationResult = batchProcessSchema.safeParse(body);

    if (!validationResult.success) {
      console.error(
        "Batch process validation failed:",
        validationResult.error.flatten(),
      );
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { maxBatchSize, dryRun, processAll } = validationResult.data;

    console.log(
      `Starting analytics batch processing (dryRun: ${dryRun}, maxBatchSize: ${maxBatchSize}, processAll: ${processAll})`,
    );

    // Snapshot the index ONCE, capped at the effective batch size. A second
    // zrange later would cover different events under concurrent inserts
    // (index shift → loss/leak), and an uncapped fetch OOMs on backlog.
    // Failed batches keep their keys, so nothing successfully stored is lost.
    const effectiveBatchSize = processAll
      ? MAX_PROCESS_ALL
      : Math.min(maxBatchSize, MAX_PROCESS_ALL);

    let eventKeys: string[];
    try {
      eventKeys = await peekAnalyticsEventKeys(effectiveBatchSize);
    } catch (cacheError) {
      console.error("Failed to read analytics index:", cacheError);
      return NextResponse.json(
        {
          error: "Failed to retrieve cached analytics events",
          details:
            cacheError instanceof Error ? cacheError.message : "Unknown error",
        },
        { status: 500 },
      );
    }

    if (eventKeys.length === 0) {
      console.log("No cached analytics events to process");
      return NextResponse.json({
        success: true,
        message: "No analytics events to process",
        processedCount: 0,
        cachedCount: 0,
      });
    }

    let paired: KeyedAnalyticsEvent[];
    try {
      paired = await readAnalyticsEventsByKeys(eventKeys);
    } catch (cacheError) {
      console.error("Failed to read cached analytics payloads:", cacheError);
      return NextResponse.json(
        {
          error: "Failed to retrieve cached analytics events",
          details:
            cacheError instanceof Error ? cacheError.message : "Unknown error",
        },
        { status: 500 },
      );
    }

    console.log(
      `Processing ${paired.length} of ${eventKeys.length} indexed events (processAll: ${processAll})`,
    );

    // Validate event structure before processing (keep each event's key so
    // only successfully stored events are removed from the index).
    const keyedValid = paired.filter(({ event }, index) => {
      if (!event || typeof event !== "object") {
        console.warn(`Invalid event at index ${index}: not an object`);
        return false;
      }
      if (!event.linkId || !event.timestamp) {
        console.warn(
          `Invalid event at index ${index}: missing required fields`,
        );
        return false;
      }
      return true;
    });

    // In-batch clickId dedupe (same click re-cached twice keeps first).
    const seenClickIds = new Set<string>();
    const deduped = keyedValid.filter(({ event }) => {
      if (!event.clickId) return true;
      if (seenClickIds.has(event.clickId)) return false;
      seenClickIds.add(event.clickId);
      return true;
    });

    const validEvents = deduped.map(({ event }) => event);
    const validKeys = deduped.map(({ key }) => key);

    if (validEvents.length !== paired.length) {
      console.warn(
        `Filtered out ${paired.length - validEvents.length} invalid/duplicate events`,
      );
    }

    if (dryRun) {
      console.log("Dry run mode - not processing events");
      return NextResponse.json({
        success: true,
        message: "Dry run completed",
        processedCount: validEvents.length,
        cachedCount: eventKeys.length,
        events: validEvents.slice(0, 5), // Return first 5 for inspection
      });
    }

    // Process events in batches to avoid database timeouts
    const BATCH_SIZE = 500; // Increased batch size for better performance
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const processedEventKeys: string[] = [];

    for (let i = 0; i < validEvents.length; i += BATCH_SIZE) {
      const batch = validEvents.slice(i, i + BATCH_SIZE);
      // Keys travel with their events (same snapshot) — no second zrange.
      const batchKeys = validKeys.slice(i, i + BATCH_SIZE);

      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validEvents.length / BATCH_SIZE)} (${batch.length} events)`,
      );

      try {
        const { count, keys } = await storeBatch(batch, batchKeys);
        successCount += count;
        processedEventKeys.push(...keys);
      } catch (batchError) {
        // Index keys are kept for retry — nothing is removed on failure.
        errorCount += batch.length;
        const errorMsg = `Batch processing error: ${batchError instanceof Error ? batchError.message : "Unknown error"}`;
        console.error("Detailed batch error:", batchError);
        errors.push(errorMsg);
      }
    }

    // Clear processed events from Redis (only successful ones)
    if (processedEventKeys.length > 0) {
      try {
        await clearProcessedAnalyticsEvents(processedEventKeys);
      } catch (cleanupError) {
        console.error(
          "Failed to clear processed events from Redis:",
          cleanupError,
        );
        // Don't fail the entire operation if cleanup fails
      }
    }

    // Get remaining count with error handling
    let remainingCount = 0;
    try {
      remainingCount = await getCachedAnalyticsCount();
    } catch (countError) {
      console.error("Failed to get remaining analytics count:", countError);
      // Continue with 0 if count retrieval fails
    }

    console.log(
      `Batch processing completed: ${successCount} successful, ${errorCount} errors, ${remainingCount} remaining`,
    );

    const response = NextResponse.json({
      success: true,
      message: "Batch processing completed",
      processedCount: successCount,
      errorCount,
      cachedCount: eventKeys.length,
      remainingCount,
      errors: errors.length > 0 ? errors : undefined,
    });

    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Batch processing error:", error);

    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      route: "analytics/batch",
      method: "POST",
    };

    console.error("Batch processing error details:", errorDetails);

    return NextResponse.json(
      { error: "Failed to process analytics batch", errorDetails },
      { status: 500 },
    );
  }
}

export const POST = withCronAuth(handler);

export async function GET() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
