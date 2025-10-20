import { redis } from "@/lib/redis";

export interface CachedAnalyticsData {
  linkId: string;
  slug: string;
  workspaceId: string;
  url: string;
  domain?: string;
  timestamp: string;
  ipAddress: string;
  country: string;
  city: string;
  continent: string;
  device: string;
  browser: string;
  os: string;
  referer: string;
  trigger: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

const ANALYTICS_ZSET_KEY = "analytics:batch";
const ANALYTICS_TTL = 60 * 60 * 24; // 24 hours TTL for safety

/**
 * Store analytics event in Redis ZSET for batch processing
 */
export async function cacheAnalyticsEvent(
  data: CachedAnalyticsData,
): Promise<void> {
  try {
    const timestamp = new Date(data.timestamp).getTime();
    const eventId = `${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    const eventKey = `analytics:event:${eventId}`;

    await redis.set(eventKey, JSON.stringify(data), { ex: ANALYTICS_TTL });

    try {
      await redis.zadd(ANALYTICS_ZSET_KEY, {
        score: timestamp,
        member: eventKey,
      });
    } catch (zsetError: unknown) {
      if (
        zsetError instanceof Error &&
        zsetError.message?.includes("WRONGTYPE")
      ) {
        console.log("Migrating analytics cache from SET to ZSET...");
        await redis.del(ANALYTICS_ZSET_KEY); // Clear old SET
        await redis.zadd(ANALYTICS_ZSET_KEY, {
          score: timestamp,
          member: eventKey,
        });
        console.log("Migration completed successfully");
      } else {
        throw zsetError;
      }
    }

    console.log(`Cached analytics event: ${eventKey} (score: ${timestamp})`);
  } catch (error) {
    console.error("Failed to cache analytics event:", error);
  }
}

/**
 * Get cached analytics events for batch processing
 */
export async function getCachedAnalyticsEvents(
  limit?: number,
): Promise<CachedAnalyticsData[]> {
  try {
    const eventKeys = (await redis.zrange(
      ANALYTICS_ZSET_KEY,
      0,
      limit ? limit - 1 : -1,
    )) as string[];

    if (eventKeys.length === 0) {
      return [];
    }

    // Get all events data
    const events = await redis.mget(eventKeys);
    const validEvents: CachedAnalyticsData[] = [];
    const invalidKeys: string[] = [];

    for (let i = 0; i < events.length; i++) {
      try {
        if (events[i]) {
          // Handle both string and object data
          let eventData: CachedAnalyticsData;
          if (typeof events[i] === "string") {
            eventData = JSON.parse(events[i] as string) as CachedAnalyticsData;
          } else if (typeof events[i] === "object" && events[i] !== null) {
            // If it's already an object, use it directly
            eventData = events[i] as CachedAnalyticsData;
          } else {
            throw new Error("Invalid event data type");
          }
          validEvents.push(eventData);
        }
      } catch (parseError) {
        console.warn(
          `Failed to parse cached analytics event: ${eventKeys[i]}`,
          parseError,
        );
        invalidKeys.push(eventKeys[i] as string);
      }
    }

    // Remove invalid events from ZSET
    if (invalidKeys.length > 0) {
      await redis.zrem(ANALYTICS_ZSET_KEY, ...invalidKeys);
    }

    return validEvents;
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("WRONGTYPE")) {
      console.log(
        "Detected old SET format for analytics events, returning empty array",
      );
      return [];
    }
    console.error("Failed to get cached analytics events:", error);
    return [];
  }
}

/**
 * Get cached analytics events within a specific time range
 */
export async function getCachedAnalyticsEventsByTimeRange(
  startTime: Date,
  endTime: Date,
): Promise<CachedAnalyticsData[]> {
  try {
    const startScore = startTime.getTime();
    const endScore = endTime.getTime();

    const eventKeys = (await redis.zrange(
      ANALYTICS_ZSET_KEY,
      startScore,
      endScore,
      { byScore: true },
    )) as string[];

    if (eventKeys.length === 0) {
      return [];
    }

    // Get all events data
    const events = await redis.mget(eventKeys);
    const validEvents: CachedAnalyticsData[] = [];

    for (let i = 0; i < events.length; i++) {
      try {
        if (events[i]) {
          // Handle both string and object data
          let eventData: CachedAnalyticsData;
          if (typeof events[i] === "string") {
            eventData = JSON.parse(events[i] as string) as CachedAnalyticsData;
          } else if (typeof events[i] === "object" && events[i] !== null) {
            // If it's already an object, use it directly
            eventData = events[i] as CachedAnalyticsData;
          } else {
            throw new Error("Invalid event data type");
          }
          validEvents.push(eventData);
        }
      } catch (parseError) {
        console.warn(
          `Failed to parse cached analytics event: ${eventKeys[i]}`,
          parseError,
        );
        await redis.zrem(ANALYTICS_ZSET_KEY, eventKeys[i] as string);
      }
    }

    return validEvents;
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("WRONGTYPE")) {
      console.log(
        "Detected old SET format for time range query, returning empty array",
      );
      return [];
    }
    console.error(
      "Failed to get cached analytics events by time range:",
      error,
    );
    return [];
  }
}

/**
 * Clear processed analytics events from Redis ZSET
 */
export async function clearProcessedAnalyticsEvents(
  processedKeys: string[],
): Promise<void> {
  try {
    if (processedKeys.length === 0) return;

    // Remove from ZSET and delete individual keys
    await redis.zrem(ANALYTICS_ZSET_KEY, ...processedKeys);
    await redis.del(...processedKeys);

    console.log(`Cleared ${processedKeys.length} processed analytics events`);
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("WRONGTYPE")) {
      console.log("Detected old SET format, clearing individual keys only");
      await redis.del(...processedKeys);
      return;
    }
    console.error("Failed to clear processed analytics events:", error);
  }
}

/**
 * Get analytics events count for monitoring
 */
export async function getCachedAnalyticsCount(): Promise<number> {
  try {
    return await redis.zcard(ANALYTICS_ZSET_KEY);
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("WRONGTYPE")) {
      console.log("Detected old SET format for analytics count, returning 0");
      return 0;
    }
    console.error("Failed to get cached analytics count:", error);
    return 0;
  }
}

/**
 * Remove old analytics events from cache (cleanup function)
 */
export async function cleanupOldAnalyticsEvents(
  olderThanHours: number = 48,
): Promise<number> {
  try {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;

    // Remove events older than cutoff time
    const removedCount = await redis.zremrangebyscore(
      ANALYTICS_ZSET_KEY,
      0,
      cutoffTime,
    );

    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old analytics events`);
    }

    return removedCount;
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("WRONGTYPE")) {
      console.log("Detected old SET format, cleanup not applicable");
      return 0;
    }
    console.error("Failed to cleanup old analytics events:", error);
    return 0;
  }
}

/**
 * Get analytics events count by time range
 */
export async function getAnalyticsCountByTimeRange(
  startTime: Date,
  endTime: Date,
): Promise<number> {
  try {
    const startScore = startTime.getTime();
    const endScore = endTime.getTime();

    return await redis.zcount(ANALYTICS_ZSET_KEY, startScore, endScore);
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("WRONGTYPE")) {
      console.log(
        "Detected old SET format for count by time range, returning 0",
      );
      return 0;
    }
    console.error("Failed to get analytics count by time range:", error);
    return 0;
  }
}
