import { Client } from "@upstash/qstash";

const client = new Client({
  token: process.env.UPSTASH_QSTASH_REST_TOKEN!,
});

export async function createUsageCronSchedule() {
  try {
    await client.schedules.create({
      destination: "https://slugy.co/api/cron/usage",
      cron: "0 0 * * *", // Daily at midnight UTC - checks and resets usage when needed
    });
    console.log("Usage cron schedule created successfully");
  } catch (error) {
    console.error("Failed to create usage cron schedule:", error);
  }
}

export async function createAnalyticsBatchSchedule() {
  try {
    await client.schedules.create({
      destination: "https://slugy.co/api/analytics/batch",
      cron: "0 */4 * * *", // Every 4 hours
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxBatchSize: 1000, // Process up to 1000 events per batch
      }),
    });
    console.log("Analytics batch processing schedule created successfully");
  } catch (error) {
    console.error("Failed to create analytics batch schedule:", error);
  }
}

export { client };
