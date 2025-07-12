import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure WebSocket for Neon's serverless driver
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true; // Enable fetch-based querying for Edge Runtime

const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  
  const client = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

  return client;
};

// Global instance for Next.js
declare global {
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

export const db = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}