import { createHash, randomBytes } from "crypto";

const API_KEY_PREFIX = "slugy_";

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

/** SHA-256 hex digest — the only form ever persisted or queried. */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/** Non-secret display hint stored alongside the hash (prefix…last4). */
export function apiKeyHint(rawKey: string): string {
  return maskApiKey(rawKey);
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}
