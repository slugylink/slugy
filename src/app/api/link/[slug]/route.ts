import { NextRequest } from "next/server";
import { jsonWithETag } from "@/lib/http";

/**
 * Legacy public link lookup — disabled.
 * Redirects use edge middleware (`getLink` / `URLRedirects`), not this API.
 * Returning 410 avoids leaking destination URLs / password state.
 */
export async function GET(req: NextRequest) {
  return jsonWithETag(
    req,
    {
      success: false,
      error: "Gone",
      message:
        "This endpoint has been removed. Use short-link redirects instead.",
    },
    { status: 410 },
  );
}
