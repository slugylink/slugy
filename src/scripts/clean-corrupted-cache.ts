import { cleanCorruptedCache } from "@/lib/cache-utils/bio-public-cache";

/**
 * Script to clean corrupted cache entries
 * Run with: npx tsx scripts/clean-corrupted-cache.ts
 */
async function main() {
  console.log("🧹 Starting cache cleanup...");

  try {
    await cleanCorruptedCache();
    console.log("✅ Cache cleanup completed successfully");
  } catch (error) {
    console.error("❌ Cache cleanup failed:", error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});
