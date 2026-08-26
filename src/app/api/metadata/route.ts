import { type NextRequest, NextResponse } from "next/server";
import { getMetaTags, isValidUrl, normalizeMetadataUrl } from "@/lib/metadata";
import { jsonWithETag } from "@/lib/http";
import { apiSuccessPayload, apiErrorPayload } from "@/lib/api-response";
import { checkFastRateLimit, normalizeIp } from "@/lib/middleware/rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
};

function getClientIP(req: NextRequest): string {
  const hasCloudflare = Boolean(req.headers.get("cf-ray"));
  const forwarded = req.headers.get("x-forwarded-for");
  const hops = forwarded
    ?.split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  return normalizeIp(
    (hasCloudflare ? req.headers.get("cf-connecting-ip") : null) ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      hops?.[hops.length - 1] ||
      "unknown",
  );
}

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rate = await checkFastRateLimit(ip);

  if (!rate.success) {
    const retryAfter = Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000));
    return jsonWithETag(
      req,
      apiErrorPayload("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", {
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  try {
    const rawUrl = req.nextUrl.searchParams.get("url")?.trim() ?? "";
    if (!rawUrl || !isValidUrl(rawUrl)) {
      return jsonWithETag(
        req,
        apiErrorPayload("Valid URL parameter is required", "BAD_REQUEST"),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const url = normalizeMetadataUrl(rawUrl);
    const metadata = await getMetaTags(url);

    return jsonWithETag(
      req,
      apiSuccessPayload({
        url,
        ...metadata,
      }),
      {
        headers: {
          ...CORS_HEADERS,
          ...CACHE_HEADERS,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch metadata";
    const isBadRequest =
      message.includes("Invalid URL") ||
      message.includes("private") ||
      message.includes("blocked");

    console.error("[metadata]", error);

    return jsonWithETag(
      req,
      apiErrorPayload(
        isBadRequest ? message : "Failed to fetch metadata",
        isBadRequest ? "BAD_REQUEST" : "INTERNAL_ERROR",
      ),
      {
        status: isBadRequest ? 400 : 500,
        headers: CORS_HEADERS,
      },
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
