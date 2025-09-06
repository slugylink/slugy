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

// Input validation schema for batch processing
const batchProcessSchema = z.object({
  maxBatchSize: z.number().min(1).max(10000).optional().default(1000),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    // Get cached analytics events
    const cachedEvents = await getCachedAnalyticsEvents();

    if (cachedEvents.length === 0) {
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

    if (dryRun) {
      console.log("Dry run mode - not processing events");
      return NextResponse.json({
        success: true,
        message: "Dry run completed",
        processedCount: eventsToProcess.length,
        cachedCount: cachedEvents.length,
        events: eventsToProcess.slice(0, 5), // Return first 5 for inspection
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
    const allEventKeys = (await redis.zrange(
      ANALYTICS_ZSET_KEY,
      0,
      maxBatchSize - 1,
    )) as string[];

    for (let i = 0; i < eventsToProcess.length; i += BATCH_SIZE) {
      const batch = eventsToProcess.slice(i, i + BATCH_SIZE);
      // Get corresponding Redis keys for this batch
      const batchKeys = allEventKeys.slice(i, i + BATCH_SIZE);

      try {
        await db.$transaction(
          async (tx) => {
            // Group events by workspace for usage updates

            for (const event of batch) {
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
          },
          {
            timeout: 30000, // 30 second timeout for batch
            maxWait: 10000, // Max wait for connection
          },
        );

        successCount += batch.length;
        processedEventKeys.push(...batchKeys);
      } catch (batchError) {
        errorCount += batch.length;
        const errorMsg = `Batch processing error: ${batchError instanceof Error ? batchError.message : "Unknown error"}`;
        console.error("Detailed batch error:", batchError);
        console.error("Event data causing error:", batch);
        errors.push(errorMsg);
      }
    }

    // Clear processed events from Redis (only successful ones)
    if (processedEventKeys.length > 0) {
      await clearProcessedAnalyticsEvents(processedEventKeys);
    }

    const remainingCount = await getCachedAnalyticsCount();

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
      { error: "Failed to process analytics batch" },
      { status: 500 },
    );
  }
}

// GET endpoint for monitoring batch status
export async function GET() {
  try {
    const cachedCount = await getCachedAnalyticsCount();

    return NextResponse.json({
      cachedEventsCount: cachedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get batch status:", error);
    return NextResponse.json(
      { error: "Failed to get batch status" },
      { status: 500 },
    );
  }
}
