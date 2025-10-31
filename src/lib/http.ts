import { NextResponse } from "next/server";
import { createHash } from "crypto";

/**
 * Creates a JSON response with ETag support for HTTP caching
 * Returns 304 Not Modified if the client's If-None-Match header matches the ETag
 *
 * @param request - The incoming request (can be null for server-side rendering)
 * @param payload - The JSON payload to send
 * @param init - Optional status code or ResponseInit object
 * @returns NextResponse with ETag headers and conditional 304 response
 */
export function jsonWithETag(
  request: Request | null,
  payload: unknown,
  init?: number | ResponseInit,
): NextResponse {
  // Generate ETag from JSON payload using SHA-256
  const jsonString = JSON.stringify(payload);
  const etag = `W/"${createHash("sha256").update(jsonString).digest("base64url")}"`;

  // Get If-None-Match header (case-insensitive)
  const ifNoneMatch = request?.headers.get("if-none-match");

  // Merge existing headers from init
  const baseHeaders = new Headers(
    typeof init === "number" ? undefined : init?.headers,
  );

  // Set ETag header (only if not already set)
  if (!baseHeaders.has("ETag")) {
    baseHeaders.set("ETag", etag);
  }

  // Set Cache-Control header (only if not already set)
  if (!baseHeaders.has("Cache-Control")) {
    baseHeaders.set("Cache-Control", "private, max-age=0, must-revalidate");
  }

  // Update Vary header to ensure user-specific data isn't shared by intermediaries
  const existingVary = baseHeaders.get("Vary");
  const varyValues = new Set<string>();

  // Parse existing Vary header
  if (existingVary) {
    existingVary.split(",").forEach((v) => {
      const trimmed = v.trim();
      if (trimmed) varyValues.add(trimmed);
    });
  }

  // Add required vary values
  varyValues.add("Authorization");
  varyValues.add("Cookie");

  baseHeaders.set("Vary", Array.from(varyValues).join(", "));

  // Check if client has cached version (weak ETag comparison)
  if (ifNoneMatch) {
    // Normalize weak ETag comparison (strip quotes and compare values)
    const normalizeETag = (tag: string): string => {
      return tag
        .trim()
        .replace(/^W\//i, "")
        .replace(/^"/, "")
        .replace(/"$/, "");
    };

    const clientETag = normalizeETag(ifNoneMatch);
    const serverETag = normalizeETag(etag);

    if (clientETag === serverETag) {
      return new NextResponse(null, {
        status: 304,
        headers: baseHeaders,
      });
    }
  }

  // Build response init with merged headers
  const responseInit: ResponseInit =
    typeof init === "number"
      ? { status: init, headers: baseHeaders }
      : { ...init, headers: baseHeaders };

  return NextResponse.json(payload, responseInit);
}
