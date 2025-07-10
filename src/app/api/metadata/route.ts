import { type NextRequest, NextResponse } from "next/server";
import { getMetaTags, isValidUrl } from "@/lib/metadata";

// Set up CORS headers for cross-origin requests
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=600", // Cache results for 1 hour
};

// Enhanced rate limiting with LRU cache behavior
const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 5 * 60 * 1000; // 5 minute window
const MAX_IPS_TRACKED = 10000; // Prevent memory leak by limiting tracked IPs

// Using a Map with timestamps for more efficient rate limiting
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

  // Clean up old entries periodically
  if (ipRequests.size > MAX_IPS_TRACKED) {
    // Remove oldest entries when we reach the limit
    const ipsToDelete = [...ipRequests.entries()]
      .sort(([, a], [, b]) => Math.min(...a) - Math.min(...b))
      .slice(0, Math.floor(MAX_IPS_TRACKED * 0.2))
      .map(([ip]) => ip);

    ipsToDelete.forEach((ip) => ipRequests.delete(ip));
  }

  const requests = ipRequests.get(ip) ?? [];
  const recentRequests = requests.filter((time) => now - time < RATE_WINDOW);

  // Update the requests list for this IP
  if (recentRequests.length >= RATE_LIMIT) {
    ipRequests.set(ip, recentRequests);
    return true;
  }

  // Add the current request timestamp
  recentRequests.push(now);
  ipRequests.set(ip, recentRequests);
  return false;
}

/**
 * Handles GET requests to fetch metadata for a URL
 */
export async function GET(req: NextRequest) {
  // Get the client IP for rate limiting
  const ip = getClientIP(req);

  // Check rate limiting
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: RATE_WINDOW / 1000 },
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
      return NextResponse.json(
        { error: "Valid URL parameter is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Fetch metadata with timeout protection from the utility
    const metadata = await getMetaTags(url);

    return NextResponse.json(
      {
        success: true,
        url,
        ...metadata,
        poweredBy: "https://slugy.co",
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("Error processing metadata request:", error);

    // More specific error handling
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch metadata",
        details: errorMessage,
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/**
 * Handles OPTIONS requests for CORS preflight
 */
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
