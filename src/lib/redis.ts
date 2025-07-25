import { Redis } from "@upstash/redis";

// Validate environment variables early for secure startup
if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  throw new Error("Missing Redis configuration in environment variables.");
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const CACHE_BASE_TTL = 60 * 60 * 23; // 23 hours, in seconds
export const CACHE_TTL_JITTER = 60 * Math.floor(Math.random() * 10); // [0, 9] minutes jitter
