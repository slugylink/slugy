import { NextResponse } from "next/server";
import { apiErrors } from "@/lib/api-response";

/**
 * Public rate-limit endpoint removed.
 * It previously accepted an arbitrary `ip` and INCR'd the same Redis keys as
 * middleware — allowing attackers to lock out victims.
 */
export async function POST() {
  return apiErrors.forbidden("This endpoint has been disabled");
}

export async function GET() {
  return NextResponse.json({ error: "Gone", code: "GONE" }, { status: 410 });
}
