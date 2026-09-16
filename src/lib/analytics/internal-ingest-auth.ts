import { createHmac, timingSafeEqual } from "crypto";

export const ANALYTICS_INGEST_HEADER = "x-slugy-analytics-signature";

function getSigningSecret(): string | null {
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.ANALYTICS_INTERNAL_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

export function signInternalAnalyticsIngest(payload: string): string {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("Analytics ingest signing secret is not configured");
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyInternalAnalyticsIngest(
  payload: string,
  signature: string | null,
): boolean {
  const secret = getSigningSecret();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}

export function analyticsIngestPayload(input: {
  linkId: string;
  workspaceId: string;
  slug: string;
}): string {
  return `${input.linkId}:${input.workspaceId}:${input.slug}`;
}
