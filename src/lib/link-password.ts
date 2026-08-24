import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const HASH_PREFIX = "scrypt$";
const SCRYPT_KEYLEN = 64;
const COOKIE_MAX_AGE_SECONDS = 60 * 15; // 15 minutes
const PASSWORD_MASK = "********";

function getCookieSecret(): string {
  return (
    process.env.LINK_PASSWORD_COOKIE_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    ""
  );
}

/** Mask used in API responses so hashes never leave the server. */
export function maskLinkPassword(
  stored: string | null | undefined,
): string | null {
  return stored ? PASSWORD_MASK : null;
}

/** True when the client sent the mask (keep existing password). */
export function isPasswordUnchanged(
  password: string | null | undefined,
): boolean {
  return password === PASSWORD_MASK;
}

export function hashLinkPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `${HASH_PREFIX}${salt}$${derived}`;
}

/**
 * Verifies a plaintext password against a stored value.
 * Supports legacy plaintext rows during migration.
 */
export function verifyLinkPassword(
  plain: string,
  stored: string | null | undefined,
): boolean {
  if (!stored || !plain) return false;

  if (stored.startsWith(HASH_PREFIX)) {
    const [, salt, hash] = stored.split("$");
    if (!salt || !hash) return false;
    try {
      const derived = scryptSync(plain, salt, SCRYPT_KEYLEN);
      const expected = Buffer.from(hash, "hex");
      if (derived.length !== expected.length) return false;
      return timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }

  // Legacy plaintext — constant-time-ish compare
  const a = Buffer.from(plain);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createPasswordVerifiedCookieValue(
  domain: string,
  slug: string,
): string | null {
  const secret = getCookieSecret();
  if (!secret) {
    console.error(
      "[LinkPassword] Missing LINK_PASSWORD_COOKIE_SECRET / BETTER_AUTH_SECRET",
    );
    return null;
  }

  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SECONDS;
  const payload = `${domain}|${slug}|${expiresAt}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${expiresAt}.${sig}`;
}

export function isPasswordVerifiedCookieValid(
  cookieValue: string | undefined,
  domain: string,
  slug: string,
): boolean {
  if (!cookieValue || cookieValue === "true") {
    // Reject legacy forgeable "true" cookies
    return false;
  }

  const secret = getCookieSecret();
  if (!secret) return false;

  const [expiresAtRaw, sig] = cookieValue.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAtRaw || !sig || !Number.isFinite(expiresAt)) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const payload = `${domain}|${slug}|${expiresAt}`;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function passwordCookieName(domain: string, slug: string): string {
  return `password_verified_${domain}_${slug}`;
}

export const LINK_PASSWORD_COOKIE_MAX_AGE = COOKIE_MAX_AGE_SECONDS;
