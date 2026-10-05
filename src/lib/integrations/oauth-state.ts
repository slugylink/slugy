import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const STATE_TTL_SECONDS = 600;

function stateSecret(): string {
  return (
    process.env.INTEGRATIONS_ENCRYPTION_KEY ||
    process.env.LINK_PASSWORD_COOKIE_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    ""
  );
}

interface OAuthStatePayload {
  w: string;
  u: string;
  n: string;
  e: number;
}

function b64urlEncode(obj: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function b64urlDecode(raw: string): OAuthStatePayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as Partial<OAuthStatePayload>;
    if (
      typeof parsed.w !== "string" ||
      typeof parsed.u !== "string" ||
      typeof parsed.n !== "string" ||
      typeof parsed.e !== "number"
    ) {
      return null;
    }
    return parsed as OAuthStatePayload;
  } catch {
    return null;
  }
}

/**
 * Bind an OAuth install to the initiating user + workspace + expiry.
 * The callback only completes when the *same logged-in manager* returns,
 * which closes the attacker-links-their-Slack-to-your-workspace hole.
 */
export function createOAuthState(
  workspaceSlug: string,
  userId: string,
): string {
  const payload = b64urlEncode({
    w: workspaceSlug,
    u: userId,
    n: randomBytes(16).toString("base64url"),
    e: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  });
  const sig = createHmac("sha256", stateSecret())
    .update(payload, "utf8")
    .digest("base64url");
  return `${payload}.${sig}`;
}

/** Returns the workspace slug when state is valid for this user, else null. */
export function verifyOAuthState(
  state: string,
  currentUserId: string,
): string | null {
  const secret = stateSecret();
  if (!secret) return null;
  const idx = state.lastIndexOf(".");
  if (idx <= 0) return null;
  const payload = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const data = b64urlDecode(payload);
  if (!data) return null;
  if (data.e < Math.floor(Date.now() / 1000)) return null;
  if (data.u !== currentUserId) return null;
  if (!data.w) return null;
  return data.w;
}
