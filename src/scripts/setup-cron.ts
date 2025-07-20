import { createUsageCronSchedule } from "@/lib/qstash";

async function main() {
  console.log("Setting up usage cron schedule...");
  await createUsageCronSchedule();
  console.log("Setup complete!");
}

main().catch(console.error); 