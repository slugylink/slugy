#!/usr/bin/env tsx

import { redis } from "@/lib/redis";

const ANALYTICS_ZSET_KEY = "analytics:batch";

/**
 * Cleanup script to remove corrupted analytics data
 */
async function cleanupCorruptedAnalytics() {
  console.log("🧹 Starting cleanup of corrupted analytics data...\n");

  try {
    // Get all event keys from ZSET
    const eventKeys = await redis.zrange(ANALYTICS_ZSET_KEY, 0, -1) as string[];
    console.log(`📋 Found ${eventKeys.length} analytics events in cache`);

    if (eventKeys.length === 0) {
      console.log("✅ No events to clean up");
      return;
    }

    // Get all events data
    const events = await redis.mget(eventKeys);
    const corruptedKeys: string[] = [];
    const validKeys: string[] = [];

    for (let i = 0; i < events.length; i++) {
      try {
        if (events[i]) {
          // Check if it's valid JSON
          if (typeof events[i] === 'string') {
            JSON.parse(events[i] as string);
            validKeys.push(eventKeys[i]);
          } else if (typeof events[i] === 'object' && events[i] !== null) {
            // Object data is valid
            validKeys.push(eventKeys[i]);
          } else {
            throw new Error('Invalid data type');
          }
        } else {
          // Null/undefined data is corrupted
          corruptedKeys.push(eventKeys[i]);
        }
      } catch (parseError) {
        console.warn(`❌ Corrupted event found: ${eventKeys[i]}`);
        corruptedKeys.push(eventKeys[i]);
      }
    }

    console.log(`📊 Found ${corruptedKeys.length} corrupted events`);
    console.log(`✅ Found ${validKeys.length} valid events`);

    if (corruptedKeys.length > 0) {
      // Remove corrupted events from ZSET
      await redis.zrem(ANALYTICS_ZSET_KEY, ...corruptedKeys);
      
      // Delete corrupted event data
      await redis.del(...corruptedKeys);
      
      console.log(`🗑️ Removed ${corruptedKeys.length} corrupted events`);
    }

    // Verify cleanup
    const remainingCount = await redis.zcard(ANALYTICS_ZSET_KEY);
    console.log(`📈 Remaining events in cache: ${remainingCount}`);

    console.log("\n🎉 Cleanup completed successfully!");

  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupCorruptedAnalytics();
}

export { cleanupCorruptedAnalytics };
