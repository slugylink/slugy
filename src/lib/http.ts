import { NextResponse } from "next/server";
import { createHash } from "crypto";

export function jsonWithETag(
  request: Request | null,
  payload: unknown,
  init?: number | ResponseInit,
) {
  const jsonString = JSON.stringify(payload);
  const etag = `W/"${createHash("sha256").update(jsonString).digest("base64url")}"`;
  const ifNoneMatch = request?.headers.get("if-none-match") ?? null;

  const baseHeaders = new Headers(
    typeof init === "number" ? undefined : init?.headers,
  );

  if (!baseHeaders.has("ETag")) baseHeaders.set("ETag", etag);
  if (!baseHeaders.has("Cache-Control")) baseHeaders.set("Cache-Control", "private, max-age=0, must-revalidate");
  // Ensure user-specific data isn't shared by intermediaries
  const vary = baseHeaders.get("Vary");
  baseHeaders.set(
    "Vary",
    vary ? `${vary}, Authorization, Cookie` : "Authorization, Cookie",
  );

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: baseHeaders,
    });
  }

  const responseInit: ResponseInit =
    typeof init === "number" ? { status: init, headers: baseHeaders } : { ...init, headers: baseHeaders };

  return NextResponse.json(payload, responseInit);
}


