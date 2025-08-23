import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_REPLICA_URL) {
  throw new Error("DATABASE_REPLICA_URL is required");
}

export const sql = neon(
  process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL!,
);
