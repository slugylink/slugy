import { redis } from "@/lib/redis";

export interface CachedAnalyticsData {
  linkId: string;
  slug: string;
  workspaceId: string;
  url: string;
  domain?: string;
  clickId?: string;
  timestamp: string;
  ipAddress: string;
  country: string;
  city: string;
  region?: string;
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
/** Persist payload and index atomically; retain until the batch acknowledges it. */
export async function cacheAnalyticsEvent(
  data: CachedAnalyticsData,
): Promise<void> {
  const timestamp = new Date(data.timestamp).getTime();
  const eventKey = `analytics:event:${crypto.randomUUID()}`;
  await redis.eval(
    `
    local kind = redis.call('TYPE', KEYS[2]).ok
    if kind ~= 'none' and kind ~= 'zset' then return redis.error_reply('Invalid analytics index type') end
    redis.call('SET', KEYS[1], ARGV[1])
    redis.call('ZADD', KEYS[2], ARGV[2], KEYS[1])
    return 1
  `,
    [eventKey, ANALYTICS_ZSET_KEY],
    [JSON.stringify(data), timestamp],
  );
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
 * Single-snapshot index read: capture up to `limit` ZSET members in ONE
 * zrange call. Callers must mget AND zrem exactly these keys — never issue a
 * second zrange for the "same" slice, because concurrent inserts shift
 * indices and the two reads then cover different events (loss/leak).
 */
export async function peekAnalyticsEventKeys(limit: number): Promise<string[]> {
  try {
    const keys = (await redis.zrange(
      ANALYTICS_ZSET_KEY,
      0,
      Math.max(0, limit - 1),
    )) as string[];
    return Array.isArray(keys) ? keys.map(String) : [];
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("WRONGTYPE")) {
      return [];
    }
    throw error;
  }
}

export interface KeyedAnalyticsEvent {
  key: string;
  event: CachedAnalyticsData;
}

/**
 * Read payloads for an exact key snapshot (pairs by mget order). Keys whose
 * payload vanished (24h TTL) or fails to parse are zrem'd immediately —
 * their data is unrecoverable, so holding the index slot only leaks memory.
 */
export async function readAnalyticsEventsByKeys(
  keys: string[],
): Promise<KeyedAnalyticsEvent[]> {
  if (keys.length === 0) return [];

  const raws = await redis.mget(keys);
  const paired: KeyedAnalyticsEvent[] = [];
  const staleKeys: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const raw = raws[i];
    try {
      if (!raw) throw new Error("missing payload");
      const event =
        typeof raw === "string"
          ? (JSON.parse(raw) as CachedAnalyticsData)
          : (raw as CachedAnalyticsData);
      if (!event || typeof event !== "object" || !event.linkId) {
        throw new Error("invalid payload");
      }
      paired.push({ key: keys[i] as string, event });
    } catch {
      staleKeys.push(keys[i] as string);
    }
  }

  if (staleKeys.length > 0) {
    try {
      await redis.zrem(ANALYTICS_ZSET_KEY, ...staleKeys);
      await redis.del(...staleKeys);
    } catch {
      // Best-effort cleanup; next run retries.
    }
  }

  return paired;
}

/**
 * Get cached analytics events within a specific time range
 */ export async function getCachedAnalyticsEventsByTimeRange(
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
