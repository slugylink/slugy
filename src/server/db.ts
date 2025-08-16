import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { readReplicas } from "@prisma/extension-read-replicas";

// Neon WebSocket config for Node.js
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
  });
  let client = new PrismaClient({ adapter, log: ["error"] });

  // Use the replica if defined
  if (process.env.DATABASE_REPLICA_URL) {
    client = client.$extends(
      readReplicas({
        url: process.env.DATABASE_REPLICA_URL,
      }),
    ) as unknown as PrismaClient;
  }
  return client;
}

export const db = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
