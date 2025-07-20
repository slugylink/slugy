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

export { client };
