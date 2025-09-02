import { createUsageCronSchedule, createAnalyticsBatchCronSchedule } from "@/lib/qstash";

async function main() {
  console.log("Setting up cron schedules...");
  
  await createUsageCronSchedule();
  await createAnalyticsBatchCronSchedule();
  
  console.log("Setup complete!");
}

main().catch(console.error); 