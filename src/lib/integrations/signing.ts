import { createHmac, timingSafeEqual } from "crypto";

export interface SignedWebhookHeaders {
  "slugy-timestamp": string;
  "slugy-signature": string;
}

/** Sign outbound payloads: v1=HMAC_SHA256(secret, `${timestamp}.${body}`). */
export function signWebhookPayload(
  secret: string,
  timestamp: string,
  body: string,
): string {
  return `v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex")}`;
}

export function buildWebhookHeaders(
  secret: string,
  body: string,
): SignedWebhookHeaders {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return {
    "slugy-timestamp": timestamp,
    "slugy-signature": signWebhookPayload(secret, timestamp, body),
  };
}

export function verifyWebhookSignature(
  secret: string,
  timestamp: string,
  body: string,
  signature: string,
  maxSkewSeconds = 300,
): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > maxSkewSeconds) return false;
  const expected = signWebhookPayload(secret, timestamp, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
