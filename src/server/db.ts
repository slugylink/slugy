import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { readReplicas } from "@prisma/extension-read-replicas";

// Neon WebSocket config for Node.js (once)
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
  });

  let client = new PrismaClient({ adapter, log: ["error"] });

  if (process.env.DATABASE_REPLICA_URL) {
    client = client.$extends(
      readReplicas({ url: process.env.DATABASE_REPLICA_URL! }),
    ) as unknown as PrismaClient;
  }

  return client;
}

export const db: PrismaClient = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}

export async function safeQuery<T>(
  queryFn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await queryFn();
  } catch (error) {
    console.error("Database query error:", error);
    return null;
  }
}
