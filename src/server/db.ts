import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure WebSocket for Neon's serverless driver
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true; // Enable fetch-based querying for Edge Runtime

// Type for the global prisma instance
type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

// Create Prisma client with Neon adapter
const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");

  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  
  // Create Prisma client with explicit configuration for Edge
  const client = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

  return client;
};

// Declare global prisma instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClientSingleton | undefined;
}

// Create or get existing Prisma client instance
export const db = globalThis.prisma ?? createPrismaClient();

// Only set global instance in development
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
