import { NextResponse } from "next/server";
import { createHash } from "crypto";

/**
 * Creates a JSON response with ETag support for HTTP caching.
 * Returns 304 Not Modified if the client's cached version is still valid.
 *
 * @param request - The incoming request (null for SSR)
 * @param payload - The JSON payload to send
 * @param init - Optional status code or ResponseInit object
 * @returns NextResponse with ETag headers and conditional 304 response
 */
export function jsonWithETag(
  request: Request | null,
  payload: unknown,
  init?: number | ResponseInit,
): NextResponse {
  const etag = generateETag(payload);
  const headers = buildHeaders(init, etag);

  // Return 304 if client has valid cached version
  if (isCacheValid(request, etag)) {
    return new NextResponse(null, { status: 304, headers });
  }

  // Return full response with ETag
  const responseInit: ResponseInit =
    typeof init === "number" ? { status: init, headers } : { ...init, headers };

  return NextResponse.json(payload, responseInit);
}

// ─────────── Helpers ───────────

/**
 * Generates a weak ETag from JSON payload using SHA-256
 */
function generateETag(payload: unknown): string {
  const jsonString = JSON.stringify(payload);
  const hash = createHash("sha256").update(jsonString).digest("base64url");
  return `W/"${hash}"`;
}

/**
 * Builds response headers with ETag, Cache-Control, and Vary
 */
function buildHeaders(
  init: number | ResponseInit | undefined,
  etag: string,
): Headers {
  const headers = new Headers(
    typeof init === "number" ? undefined : init?.headers,
  );

  // Set ETag (if not already set)
  if (!headers.has("ETag")) {
    headers.set("ETag", etag);
  }

  // Set Cache-Control (if not already set)
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  }

  // Add Vary headers for user-specific data
  setVaryHeader(headers);

  return headers;
}

/**
 * Updates Vary header to prevent sharing user-specific data
 */
function setVaryHeader(headers: Headers): void {
  const existingVary = headers.get("Vary");
  const varyValues = new Set<string>(["Authorization", "Cookie"]);

  // Parse and merge existing Vary values
  if (existingVary) {
    existingVary.split(",").forEach((value) => {
      const trimmed = value.trim();
      if (trimmed) varyValues.add(trimmed);
    });
  }

  headers.set("Vary", Array.from(varyValues).join(", "));
}

/**
 * Checks if client's cached version matches server ETag
 */
function isCacheValid(request: Request | null, etag: string): boolean {
  const ifNoneMatch = request?.headers.get("if-none-match");
  if (!ifNoneMatch) return false;

  const clientETag = normalizeETag(ifNoneMatch);
  const serverETag = normalizeETag(etag);

  return clientETag === serverETag;
}

/**
 * Normalizes ETag for comparison (strips W/ prefix and quotes)
 */
function normalizeETag(tag: string): string {
  return tag.trim().replace(/^W\//i, "").replace(/^"|"$/g, "");
}
