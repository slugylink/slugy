import { NextResponse } from "next/server";

export async function GET() {
  const envVars = {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? "Set" : "Not set",
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? "Set" : "Not set",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "Not set",
    NEXT_BASE_URL: process.env.NEXT_BASE_URL || "Not set",
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json({
    message: "OAuth Debug Information",
    environment: envVars,
    timestamp: new Date().toISOString(),
  });
} 