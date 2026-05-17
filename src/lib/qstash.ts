import { Client } from "@upstash/qstash";

function getQstashToken() {
  return process.env.UPSTASH_QSTASH_REST_TOKEN || process.env.QSTASH_TOKEN;
}

function getClient() {
  const token = getQstashToken();
  return new Client({
    token: token!,
  });
}

function getCronBaseUrl() {
  return (
    process.env.CRON_BASE_URL ||
    process.env.APP_URL ||
    process.env.NEXT_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_BASE_URL ||
    "https://app.slugy.co"
  ).replace(/\/+$/, "");
}

function assertQstashConfig() {
  const qstashToken = getQstashToken();
  if (!qstashToken) {
    throw new Error(
      "Missing QStash token. Set UPSTASH_QSTASH_REST_TOKEN or QSTASH_TOKEN.",
    );
  }

  const baseUrl = getCronBaseUrl();
  if (baseUrl.includes("localhost")) {
    throw new Error(
      `Refusing to create cron schedules for local URL: ${baseUrl}. Set CRON_BASE_URL to your production app host.`,
    );
  }
}

export async function createUsageCronSchedule() {
  try {
    assertQstashConfig();
    await getClient().schedules.create({
      destination: `${getCronBaseUrl()}/api/cron/usage`,
      cron: "0 0 * * *", // Daily at midnight UTC - checks and resets usage when needed
      method: "POST",
    });
    console.log("Usage cron schedule created successfully");
  } catch (error) {
    console.error("Failed to create usage cron schedule:", error);
    throw error;
  }
}

export async function createSubscriptionRenewalCronSchedule() {
  try {
    assertQstashConfig();
    await getClient().schedules.create({
      destination: `${getCronBaseUrl()}/api/cron/subscription-renewal`,
      cron: "10 0 * * *", // Daily after usage reconciliation
      method: "POST",
    });
    console.log("Subscription renewal cron schedule created successfully");
  } catch (error) {
    console.error(
      "Failed to create subscription renewal cron schedule:",
      error,
    );
    throw error;
  }
}

export async function createAnalyticsBatchSchedule() {
  try {
    assertQstashConfig();
    await getClient().schedules.create({
      destination: `${getCronBaseUrl()}/api/analytics/batch`,
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
    throw error;
  }
}

export { getClient as client };
