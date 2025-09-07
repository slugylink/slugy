import { db } from "@/server/db";
import { redis } from "@/lib/redis";
import { getCachedAnalyticsEvents, clearProcessedAnalyticsEvents, CachedAnalyticsData } from "@/lib/cache-utils/analytics-cache";

const ANALYTICS_ZSET_KEY = "analytics:batch";

async function cleanupOrphanedAnalytics() {
  console.log("Starting cleanup of orphaned analytics events...");

  try {
    // Get all cached events
    const cachedEvents = await getCachedAnalyticsEvents();
    console.log(`Found ${cachedEvents.length} cached analytics events`);

    if (cachedEvents.length === 0) {
      console.log("No cached events to clean up");
      return;
    }

    // Extract unique link IDs from cached events
    const linkIds = [...new Set(cachedEvents.map(event => event.linkId))];
    console.log(`Found ${linkIds.length} unique link IDs in cached events`);

    // Check which links actually exist in the database
    const existingLinks = await db.link.findMany({
      where: {
        id: { in: linkIds },
        deletedAt: null, // Only include non-deleted links
      },
      select: { id: true },
    });

    const existingLinkIds = new Set(existingLinks.map(link => link.id));
    console.log(`Found ${existingLinks.length} existing links in database`);

    // Find orphaned events (events for non-existent or deleted links)
    const orphanedEvents = cachedEvents.filter(event => !existingLinkIds.has(event.linkId));
    const validEvents = cachedEvents.filter(event => existingLinkIds.has(event.linkId));

    console.log(`Found ${orphanedEvents.length} orphaned events and ${validEvents.length} valid events`);

    if (orphanedEvents.length === 0) {
      console.log("No orphaned events found - all cached events are valid");
      return;
    }

    // Get all Redis event keys
    const allEventKeys = (await redis.zrange(ANALYTICS_ZSET_KEY, 0, -1)) as string[];
    console.log(`Found ${allEventKeys.length} total Redis keys`);

    // Get all event data to find matches
    const allEventData = await redis.mget(allEventKeys);
    const orphanedKeys: string[] = [];

    // Find Redis keys that correspond to orphaned events
    for (let i = 0; i < allEventData.length; i++) {
      try {
        const eventData = allEventData[i];
        if (!eventData) continue;

        let parsedEvent: CachedAnalyticsData;
        if (typeof eventData === 'string') {
          parsedEvent = JSON.parse(eventData) as CachedAnalyticsData;
        } else if (typeof eventData === 'object' && eventData !== null) {
          parsedEvent = eventData as CachedAnalyticsData;
        } else {
          continue;
        }

        // Check if this event is for an orphaned link
        if (!existingLinkIds.has(parsedEvent.linkId)) {
          orphanedKeys.push(allEventKeys[i]);
        }
      } catch (parseError) {
        console.warn(`Failed to parse event data for key ${allEventKeys[i]}:`, parseError);
        // If we can't parse it, it's probably corrupted, so remove it
        orphanedKeys.push(allEventKeys[i]);
      }
    }

    console.log(`Found ${orphanedKeys.length} orphaned Redis keys to remove`);

    if (orphanedKeys.length > 0) {
      // Remove orphaned keys from Redis
      await clearProcessedAnalyticsEvents(orphanedKeys);
      console.log(`Successfully removed ${orphanedKeys.length} orphaned Redis keys`);
    }

    console.log("Cleanup completed successfully!");
    console.log(`Summary:`);
    console.log(`  - Total cached events: ${cachedEvents.length}`);
    console.log(`  - Valid events: ${validEvents.length}`);
    console.log(`  - Orphaned events removed: ${orphanedEvents.length}`);
    console.log(`  - Redis keys removed: ${orphanedKeys.length}`);

  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupOrphanedAnalytics()
    .then(() => {
      console.log("Cleanup script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Cleanup script failed:", error);
      process.exit(1);
    });
}

export { cleanupOrphanedAnalytics };
