#!/usr/bin/env tsx

import { redis } from "@/lib/redis";

const ANALYTICS_ZSET_KEY = "analytics:batch";

/**
 * Simple script to clear all analytics cache data
 */
async function clearRedisCache() {
  console.log("🧹 Clearing all analytics cache data...\n");

  try {
    // Get all event keys
    const eventKeys = await redis.zrange(ANALYTICS_ZSET_KEY, 0, -1) as string[];
    console.log(`📋 Found ${eventKeys.length} events in cache`);

    if (eventKeys.length > 0) {
      // Clear the ZSET
      await redis.del(ANALYTICS_ZSET_KEY);
      console.log("✅ Cleared analytics ZSET");

      // Delete all individual event keys
      await redis.del(...eventKeys);
      console.log(`✅ Deleted ${eventKeys.length} event keys`);
    } else {
      console.log("ℹ️  No events found in cache");
    }

    // Verify cleanup
    const remainingCount = await redis.zcard(ANALYTICS_ZSET_KEY);
    console.log(`📈 Remaining events: ${remainingCount}`);

    console.log("\n🎉 Cache cleared successfully!");

  } catch (error) {
    console.error("❌ Clear failed:", error);
    process.exit(1);
  }
}

// Run the clear if this script is executed directly
if (require.main === module) {
  clearRedisCache();
}

export { clearRedisCache };
