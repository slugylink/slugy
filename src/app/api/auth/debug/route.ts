import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    message: "OAuth Debug Information",
    environment: {
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? "Set" : "Not set",
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET
        ? "Set"
        : "Not set",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ? "Set" : "Not set",
      NEXT_BASE_URL: process.env.NEXT_BASE_URL ? "Set" : "Not set",
      NODE_ENV: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
  });
}
