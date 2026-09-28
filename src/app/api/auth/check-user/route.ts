import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail } from "@/lib/auth";
import {
  checkAuthCheckRateLimit,
  normalizeIp,
} from "@/lib/middleware/rate-limit";

const emailSchema = z.string().trim().email().max(255);

function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const hops = forwarded
    ?.split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  return normalizeIp(
    request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      hops?.[hops.length - 1] ||
      "unknown",
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = emailSchema.safeParse(searchParams.get("email") ?? "");

    if (!parsed.success) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Strict pre-auth throttle (per-IP + per-target) — this endpoint is an
    // account-existence oracle by design (login routes credential vs
    // magic-link off it), so sweeping it must hit 429 fast. Validated after
    // parsing so junk input can't burn the target bucket.
    const rate = await checkAuthCheckRateLimit(
      getClientIP(request),
      parsed.data,
    );
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.max(
              1,
              Math.ceil((rate.reset - Date.now()) / 1000),
            ).toString(),
          },
        },
      );
    }

    const user = await getUserByEmail(parsed.data);
    return NextResponse.json(
      {
        exists: !!user,
        provider: user?.accounts[0]?.providerId ?? null,
        emailVerified: user?.emailVerified ?? false,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Error checking user existence:", error);
    return NextResponse.json(
      { error: "Failed to check user existence" },
      { status: 500 },
    );
  }
}
