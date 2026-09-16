import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail } from "@/lib/auth";
import { checkFastRateLimit, normalizeIp } from "@/lib/middleware/rate-limit";

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
    const rate = await checkFastRateLimit(getClientIP(request));
    if (!rate.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = emailSchema.safeParse(searchParams.get("email") ?? "");

    if (!parsed.success) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await getUserByEmail(parsed.data);
    return NextResponse.json({
      exists: !!user,
      provider: user?.accounts[0]?.providerId ?? null,
      emailVerified: user?.emailVerified ?? false,
    });
  } catch (error) {
    console.error("Error checking user existence:", error);
    return NextResponse.json(
      { error: "Failed to check user existence" },
      { status: 500 },
    );
  }
}
