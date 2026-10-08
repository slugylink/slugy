import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import {
  createSubscriptionRenewalCronSchedule,
  createUsageCronSchedule,
  createAnalyticsBatchSchedule,
} from "../lib/qstash";

async function main() {
  console.log("Setting up usage cron schedule...");
  await createUsageCronSchedule();
  console.log("Setting up subscription renewal cron schedule...");
  await createSubscriptionRenewalCronSchedule();
  await createAnalyticsBatchSchedule();
  console.log("Setup complete!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
