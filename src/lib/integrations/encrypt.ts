import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

function encryptionKey(): Buffer {
  const raw =
    process.env.INTEGRATIONS_ENCRYPTION_KEY ||
    process.env.LINK_PASSWORD_COOKIE_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "";
  if (!raw) throw new Error("Missing integrations encryption key");
  return createHash("sha256").update(raw, "utf8").digest();
}

const PREFIX = "enc1:";

/** AES-256-GCM envelope for OAuth tokens stored in Integration.config. */
export function encryptSecret(plain: string): string {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${body.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptSecret(envelope: string): string {
  if (!envelope.startsWith(PREFIX)) return envelope;
  const key = encryptionKey();
  const [, rest] = envelope.split(":", 2);
  const [ivB64, bodyB64, tagB64] = (rest ?? "").split(".");
  if (!ivB64 || !bodyB64 || !tagB64)
    throw new Error("Malformed secret envelope");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const body = Buffer.concat([
    decipher.update(Buffer.from(bodyB64, "base64url")),
    decipher.final(),
  ]);
  return body.toString("utf8");
}

/** SHA-256 hex for webhook secrets — only the hash is persisted. */
export function hashWebhookSecret(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function webhookSecretHint(raw: string): string {
  if (raw.length <= 12) return "whsec_…";
  return `whsec_…${raw.slice(-4)}`;
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}
