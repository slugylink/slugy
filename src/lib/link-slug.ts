import { customAlphabet } from "nanoid";

/**
 * Single source of truth for short-link slug rules. Slugs live in the same
 * path space as the app/marketing routes on slugy.co, so anything route-like
 * must be rejected at creation — otherwise the link is stored but never
 * redirects (proxy + route handlers shadow it).
 */

const generateRandomSlug = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  7,
);

export { generateRandomSlug };

/** Letters, numbers, `_` and `-` only. Dots, slashes, spaces, `&` etc. are out. */
export const LINK_SLUG_PATTERN = /^[A-Za-z0-9_-]{3,50}$/;

export const MAX_LINK_SLUG_LENGTH = 50;
export const MIN_LINK_SLUG_LENGTH = 3;

/**
 * Single-segment paths that resolve to a page/API on slugy.co (or a
 * subdomain path) and would therefore shadow — or be shadowed by — a short
 * link. Compared case-insensitively.
 */
export const RESERVED_LINK_SLUGS: ReadonlySet<string> = new Set(
  [
    // Auth
    "login",
    "signup",
    "forgot-password",
    "reset-password",
    "verify-email",
    "email-verified",
    // Marketing / root pages
    "pricing",
    "features",
    "about",
    "contact",
    "blogs",
    "tools",
    "sponsors",
    "alternative",
    "expired",
    "test",
    "testz",
    "terms",
    "privacy",
    "404",
    "500",
    "not-found",
    // App areas & sub-paths
    "onboarding",
    "extension",
    "upgrade",
    "account",
    "theme",
    "bio-links",
    "bio",
    "b",
    "app",
    "admin",
    "api",
    "share",
    "monitoring",
    "invite",
    "send-invitation",
    "accept-invitation",
    "custom-domain",
    "dashboard",
    "settings",
    "analytics",
    "domains",
    "sentry-example-page",
  ].map((slug) => slug.toLowerCase()),
);

export type SlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; message: string };

/** Validate a user-supplied slug. Random slugs from `generateRandomSlug` skip this. */
export function validateLinkSlug(raw: string): SlugValidationResult {
  const slug = raw.trim();

  if (
    slug.length < MIN_LINK_SLUG_LENGTH ||
    slug.length > MAX_LINK_SLUG_LENGTH
  ) {
    return {
      ok: false,
      message: `Slug must be ${MIN_LINK_SLUG_LENGTH}-${MAX_LINK_SLUG_LENGTH} characters`,
    };
  }

  if (!LINK_SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      message:
        "Slug may only contain letters, numbers, hyphens and underscores",
    };
  }

  if (RESERVED_LINK_SLUGS.has(slug.toLowerCase())) {
    return { ok: false, message: "This slug is reserved — try another one" };
  }

  return { ok: true, slug };
}

export function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  );
}

/** Thrown when a slug is taken (custom) or keeps colliding (random). */
export class SlugConflictError extends Error {
  constructor(message = "Slug already exists for this domain!") {
    super(message);
    this.name = "SlugConflictError";
  }
}

/**
 * Create a link with collision handling. Custom slugs fail fast with
 * SlugConflictError; random slugs retry with a fresh nanoid (default 5
 * attempts ≈ never 409s at 62^7 space outside adversarial floods).
 */
export async function createLinkWithUniqueSlug<T>(
  customSlug: string | null,
  create: (slug: string) => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  if (customSlug) {
    try {
      return await create(customSlug);
    } catch (error) {
      if (!isPrismaUniqueViolation(error)) throw error;
      throw new SlugConflictError();
    }
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await create(generateRandomSlug());
    } catch (error) {
      if (!isPrismaUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw new SlugConflictError(
    "Could not generate a unique slug, please try again.",
  );
}

/** Shared expiry guards: future-dated, and the fallback must not loop. */
export function validateLinkExpiry(input: {
  expiresAt?: string | Date | null;
  expirationUrl?: string | null;
  url: string;
}):
  | { ok: true }
  | { ok: false; message: string; path: "expiresAt" | "expirationUrl" } {
  if (input.expiresAt) {
    const when = new Date(input.expiresAt).getTime();
    if (Number.isNaN(when)) {
      return {
        ok: false,
        message: "Expiration date is invalid",
        path: "expiresAt",
      };
    }
    if (when <= Date.now()) {
      return {
        ok: false,
        message: "Expiration must be in the future",
        path: "expiresAt",
      };
    }
  }

  if (input.expirationUrl && input.expirationUrl.trim() === input.url.trim()) {
    return {
      ok: false,
      message: "Expiration URL must be different from the destination URL",
      path: "expirationUrl",
    };
  }

  return { ok: true };
}
