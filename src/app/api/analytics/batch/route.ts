import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { z } from "zod";
import { redis } from "@/lib/redis";
import {
  getCachedAnalyticsEvents,
  clearProcessedAnalyticsEvents,
  getCachedAnalyticsCount,
} from "@/lib/cache-utils/analytics-cache";

const ANALYTICS_ZSET_KEY = "analytics:batch";
const BATCH_PROCESS = 15000;

// Input validation schema for batch processing
const batchProcessSchema = z.object({
  maxBatchSize: z.number().min(1).max(BATCH_PROCESS).optional().default(BATCH_PROCESS),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    // Safely parse request body with error handling
    let body;
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
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

    const { maxBatchSize, dryRun } = validationResult.data;

    console.log(
      `Starting analytics batch processing (dryRun: ${dryRun}, maxBatchSize: ${maxBatchSize})`,
    );

    // Get cached analytics events with error handling
    let cachedEvents;
    try {
      cachedEvents = await getCachedAnalyticsEvents();
    } catch (cacheError) {
      console.error("Failed to get cached analytics events:", cacheError);
      return NextResponse.json(
        {
          error: "Failed to retrieve cached analytics events",
          details: cacheError instanceof Error ? cacheError.message : "Unknown error",
        },
        { status: 500 },
      );
    }

    if (!Array.isArray(cachedEvents) || cachedEvents.length === 0) {
      console.log("No cached analytics events to process");
      return NextResponse.json({
        success: true,
        message: "No analytics events to process",
        processedCount: 0,
        cachedCount: 0,
      });
    }

    // Limit batch size for processing
    const eventsToProcess = cachedEvents.slice(0, maxBatchSize);
    console.log(
      `Processing ${eventsToProcess.length} of ${cachedEvents.length} cached events`,
    );

    // Validate event structure before processing
    const validEvents = eventsToProcess.filter((event, index) => {
      if (!event || typeof event !== 'object') {
        console.warn(`Invalid event at index ${index}: not an object`);
        return false;
      }
      if (!event.linkId || !event.timestamp) {
        console.warn(`Invalid event at index ${index}: missing required fields`, {
          linkId: event.linkId,
          timestamp: event.timestamp,
        });
        return false;
      }
      return true;
    });

    if (validEvents.length !== eventsToProcess.length) {
      console.warn(`Filtered out ${eventsToProcess.length - validEvents.length} invalid events`);
    }

    if (dryRun) {
      console.log("Dry run mode - not processing events");
      return NextResponse.json({
        success: true,
        message: "Dry run completed",
        processedCount: validEvents.length,
        cachedCount: cachedEvents.length,
        events: validEvents.slice(0, 5), // Return first 5 for inspection
      });
    }

    // Process events in batches to avoid database timeouts
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const processedEventKeys: string[] = [];

    // Get the actual Redis keys for the events we're processing
    // Since we're using ZSET, we need to get the keys that correspond to our events
    let allEventKeys: string[] = [];
    try {
      const redisResult = await redis.zrange(ANALYTICS_ZSET_KEY, 0, maxBatchSize - 1);
      allEventKeys = Array.isArray(redisResult) ? redisResult.map(String) : [];
    } catch (redisError) {
      console.error("Failed to get Redis event keys:", redisError);
      // Continue processing without Redis keys if Redis fails
      allEventKeys = [];
    }

    for (let i = 0; i < validEvents.length; i += BATCH_SIZE) {
      const batch = validEvents.slice(i, i + BATCH_SIZE);
      // Get corresponding Redis keys for this batch
      const batchKeys = allEventKeys.slice(i, i + BATCH_SIZE);

      try {
        await db.$transaction(
          async (tx) => {
            // Group events by workspace for usage updates

            // First, validate that all links in this batch exist
            const linkIds = [...new Set(batch.map(event => event.linkId))];
            const existingLinks = await tx.link.findMany({
              where: {
                id: { in: linkIds },
                deletedAt: null, // Only include non-deleted links
              },
              select: { id: true },
            });

            const existingLinkIds = new Set(existingLinks.map(link => link.id));
            const validBatchEvents = batch.filter(event => existingLinkIds.has(event.linkId));

            // Log skipped events if any
            if (validBatchEvents.length !== batch.length) {
              const skippedCount = batch.length - validBatchEvents.length;
              const skippedLinkIds = batch
                .filter(event => !existingLinkIds.has(event.linkId))
                .map(event => event.linkId);
              console.warn(`Skipped ${skippedCount} events with non-existent or deleted link IDs:`, skippedLinkIds);
            }

            // Only process events for existing links
            for (const event of validBatchEvents) {
              // Create analytics record
              await tx.analytics.create({
                data: {
                  linkId: event.linkId,
                  clickedAt: new Date(event.timestamp),
                  ipAddress: event.ipAddress?.substring(0, 45),
                  country: event.country?.substring(0, 100),
                  city: event.city?.substring(0, 100),
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
                },
              });
            }

            // Update success count to reflect actual processed events
            successCount += validBatchEvents.length;
          },
          {
            timeout: 30000, // 30 second timeout for batch
            maxWait: 10000, // Max wait for connection
          },
        );

        processedEventKeys.push(...batchKeys);
      } catch (batchError) {
        // Since we validate links inside the transaction, any error here is unexpected
        // but we still count all events in this batch as failed for safety
        errorCount += batch.length;
        const errorMsg = `Batch processing error: ${batchError instanceof Error ? batchError.message : "Unknown error"}`;
        console.error("Detailed batch error:", batchError);
        console.error("Event data causing error:", batch);
        errors.push(errorMsg);
      }
    }

    // Clear processed events from Redis (only successful ones)
    if (processedEventKeys.length > 0) {
      try {
        await clearProcessedAnalyticsEvents(processedEventKeys);
      } catch (cleanupError) {
        console.error("Failed to clear processed events from Redis:", cleanupError);
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
      cachedCount: cachedEvents.length,
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

// GET endpoint for monitoring batch status
export async function GET() {
  try {
    let cachedCount = 0;
    try {
      cachedCount = await getCachedAnalyticsCount();
    } catch (countError) {
      console.error("Failed to get cached analytics count:", countError);
      // Return 0 if count retrieval fails, but don't fail the endpoint
    }

    return NextResponse.json({
      cachedEventsCount: cachedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get batch status:", error);
    return NextResponse.json(
      {
        error: "Failed to get batch status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
