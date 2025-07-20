import { Client } from "@upstash/qstash";

const client = new Client({
  token: process.env.UPSTASH_QSTASH_REST_TOKEN!,
});

await client.schedules.create({
  destination: "https://slugy.co/api/cron/usage",
  cron: "0 0 1 * *", // First day of every month at midnight UTC
});
