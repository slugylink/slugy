import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const primarySql = neon(process.env.DATABASE_URL);
export const replicaSql = process.env.DATABASE_REPLICA_URL
  ? neon(process.env.DATABASE_REPLICA_URL)
  : primarySql;

export const sql = replicaSql;
