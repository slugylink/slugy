import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Fail fast on missing/invalid env (DATABASE_URL, BETTER_AUTH_SECRET,
    // production provider keys) instead of crashing at first request.
    await import("@/lib/env");
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
