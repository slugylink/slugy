import { type NextRequest, NextResponse } from "next/server";
import { getMetaTags, isValidUrl } from "@/lib/metadata";
import { jsonWithETag } from "@/lib/http";
import { apiSuccessPayload, apiErrorPayload, apiErrors } from "@/lib/api-response";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=600",
};

const RATE_LIMIT = 100;
const RATE_WINDOW = 5 * 60 * 1000;
const MAX_IPS_TRACKED = 10000;

const ipRequests = new Map<string, number[]>();

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  if (ipRequests.size > MAX_IPS_TRACKED) {
    const ipsToDelete = [...ipRequests.entries()]
      .sort(([, a], [, b]) => Math.min(...a) - Math.min(...b))
      .slice(0, Math.floor(MAX_IPS_TRACKED * 0.2))
      .map(([ip]) => ip);

    ipsToDelete.forEach((ip) => ipRequests.delete(ip));
  }

  const requests = ipRequests.get(ip) ?? [];
  const recentRequests = requests.filter((time) => now - time < RATE_WINDOW);

  if (recentRequests.length >= RATE_LIMIT) {
    ipRequests.set(ip, recentRequests);
    return true;
  }

  recentRequests.push(now);
  ipRequests.set(ip, recentRequests);
  return false;
}

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);

  if (isRateLimited(ip)) {
    return jsonWithETag(
      req,
      apiErrorPayload("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", { retryAfter: RATE_WINDOW / 1000 }),
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": (RATE_WINDOW / 1000).toString(),
        },
      },
    );
  }

  try {
    const url = req.nextUrl.searchParams.get("url");

    if (!url || !isValidUrl(url)) {
      return jsonWithETag(
        req,
        apiErrorPayload("Valid URL parameter is required", "BAD_REQUEST"),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const metadata = await getMetaTags(url);

    return jsonWithETag(
      req,
      apiSuccessPayload({
        url,
        ...metadata,
        poweredBy: "https://slugy.co",
      }),
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("Error processing metadata request:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return jsonWithETag(
      req,
      apiErrorPayload("Failed to fetch metadata", "INTERNAL_ERROR", errorMessage),
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
