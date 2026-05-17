#!/usr/bin/env tsx

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createAnalyticsBatchSchedule } from "../lib/qstash";

/**
 * Setup script for initializing analytics batch processing with QStash
 */
async function setupAnalyticsBatch() {
  console.log("🚀 Setting up analytics batch processing...\n");

  try {
    console.log(
      "⏰ Creating QStash schedule for analytics batch processing...",
    );
    await createAnalyticsBatchSchedule();
    console.log("✅ Analytics batch schedule created successfully!\n");

    console.log("📋 Schedule Details:");
    console.log("   • Endpoint: https://slugy.co/api/analytics/batch");
    console.log("   • Frequency: Every 4 hours");
    console.log("   • Method: POST");
    console.log("   • Max Batch Size: 1000 events\n");

    console.log("🎉 Setup completed successfully!");
    console.log(
      "ℹ️  Analytics events will now be cached in Redis and processed every 4 hours.",
    );
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupAnalyticsBatch();
}

export { setupAnalyticsBatch };
