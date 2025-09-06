#!/usr/bin/env tsx

import { redis } from "@/lib/redis";

const ANALYTICS_ZSET_KEY = "analytics:batch";

/**
 * Migration script to handle SET to ZSET transition
 */
async function migrateAnalyticsCache() {
  console.log("🔄 Starting analytics cache migration from SET to ZSET...\n");

  try {
    // Check if the key exists and what type it is
    const keyType = await redis.type(ANALYTICS_ZSET_KEY);
    console.log(`📊 Current key type: ${keyType}`);

    if (keyType === "set") {
      console.log("🔍 Found old SET format, clearing it...");
      
      // Get all members from the old SET
      const oldMembers = await redis.smembers(ANALYTICS_ZSET_KEY);
      console.log(`📋 Found ${oldMembers.length} old members in SET`);
      
      // Clear the old SET
      await redis.del(ANALYTICS_ZSET_KEY);
      console.log("✅ Cleared old SET data");
      
      console.log("ℹ️  Note: Old analytics events were cleared during migration");
      console.log("ℹ️  New events will be stored in ZSET format going forward");
      
    } else if (keyType === "zset") {
      console.log("✅ Key is already a ZSET, no migration needed");
      
      // Check ZSET size
      const count = await redis.zcard(ANALYTICS_ZSET_KEY);
      console.log(`📊 ZSET contains ${count} events`);
      
    } else if (keyType === "none") {
      console.log("ℹ️  Key doesn't exist, ready for ZSET operations");
      
    } else {
      console.log(`⚠️  Unexpected key type: ${keyType}`);
      console.log("🧹 Clearing the key to start fresh...");
      await redis.del(ANALYTICS_ZSET_KEY);
      console.log("✅ Key cleared");
    }

    console.log("\n🎉 Migration completed successfully!");
    console.log("📝 Analytics cache is now ready for ZSET operations");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateAnalyticsCache();
}

export { migrateAnalyticsCache };
