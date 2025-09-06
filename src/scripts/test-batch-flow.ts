#!/usr/bin/env tsx

import { cacheAnalyticsEvent, getCachedAnalyticsCount, getCachedAnalyticsEvents } from "@/lib/cache-utils/analytics-cache";

/**
 * Test script to verify the complete batch processing flow
 */
async function testBatchFlow() {
  console.log("🧪 Testing complete batch processing flow...\n");

  try {
    // Step 1: Add a test analytics event
    console.log("📝 Step 1: Adding test analytics event...");
    
    const testEvent = {
      linkId: "test-link-batch-1",
      slug: "test-batch-slug",
      workspaceId: "test-workspace-batch",
      url: "https://example-batch.com",
      timestamp: new Date().toISOString(),
      ipAddress: "192.168.1.100",
      country: "us",
      city: "san francisco",
      continent: "north america",
      device: "desktop",
      browser: "chrome",
      os: "windows",
      referer: "https://test.com",
      trigger: "click",
      utm_source: "test",
      utm_medium: "batch",
    };

    await cacheAnalyticsEvent(testEvent);
    console.log("✅ Test event cached successfully");

    // Step 2: Check cached count
    console.log("\n📊 Step 2: Checking cached events count...");
    const count = await getCachedAnalyticsCount();
    console.log(`📈 Cached events count: ${count}`);

    // Step 3: Get cached events
    console.log("\n🔍 Step 3: Retrieving cached events...");
    const cachedEvents = await getCachedAnalyticsEvents();
    console.log(`📋 Retrieved ${cachedEvents.length} events`);
    
    if (cachedEvents.length > 0) {
      console.log("Sample event:", JSON.stringify(cachedEvents[0], null, 2));
    }

    console.log("\n🎉 Batch flow test completed!");
    console.log("ℹ️  You can now test the batch API endpoint with this data");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testBatchFlow();
}

export { testBatchFlow };
