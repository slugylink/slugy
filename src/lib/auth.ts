import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { cache } from "react";
import { magicLink, admin, organization } from "better-auth/plugins";
import { db } from "@/server/db";
import { sendEmail, sendOrganizationInvitation } from "@/server/actions/email";
import { polar, checkout } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { origins } from "@/constants/origins";
import { templates } from "@/constants/email-templates";

let _polarClientAuth: Polar | null = null;

const getAppBaseUrl = () =>
  process.env.NEXT_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_BASE_URL ||
  "http://localhost:3000";

/** Parent cookie domain for app + marketing hosts (e.g. `.slugy.co`). */
const getAuthCookieDomain = (): string | undefined => {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (!root) return undefined;

  const host = root.split(":")[0]?.toLowerCase();
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return undefined;
  }

  return host.startsWith(".") ? host : `.${host}`;
};

const getPolarServer = () =>
  process.env.NODE_ENV === "production" ? "production" : "sandbox";

/**
 * Server-side password policy — mirrors the signup/reset client schemas so a
 * direct POST /api/auth/sign-up/email can't set a weak password.
 * Enforced inside the `hash` hook, which runs on sign-up, reset and change.
 */
export const PASSWORD_POLICY_MESSAGE =
  "Password must be 8-100 characters and include an uppercase letter, a lowercase letter, a number and a special character";

export function validatePasswordStrength(password: string): void {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 100 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new APIError("BAD_REQUEST", { message: PASSWORD_POLICY_MESSAGE });
  }
}

/**
 * OAuth providers are opt-in per complete env pair. A half-configured or
 * missing provider is omitted (clean "provider not configured" at runtime)
 * instead of crashing with `undefined` client credentials.
 */
function resolveSocialProviders() {
  const githubId = process.env.GITHUB_CLIENT_ID?.trim();
  const githubSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  for (const [name, id, secret] of [
    ["GITHUB", githubId, githubSecret],
    ["GOOGLE", googleId, googleSecret],
  ] as const) {
    if ((id && !secret) || (!id && secret)) {
      console.warn(
        `[Auth] ${name}_CLIENT_ID/SECRET is half-configured — ${name.toLowerCase()} login disabled until both are set.`,
      );
    }
  }

  return {
    ...(githubId && githubSecret
      ? { github: { clientId: githubId, clientSecret: githubSecret } }
      : {}),
    ...(googleId && googleSecret
      ? { google: { clientId: googleId, clientSecret: googleSecret } }
      : {}),
  };
}

const resolveTokenFromUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    const queryToken = parsed.searchParams.get("token");
    if (queryToken) return queryToken;

    const pathToken = parsed.pathname.split("/").filter(Boolean).pop();
    return pathToken || null;
  } catch {
    const tokenMatch = rawUrl.match(/\/reset-password\/([^?]+)/);
    return tokenMatch?.[1] ?? null;
  }
};

const getPolarClient = () => {
  if (!_polarClientAuth) {
    _polarClientAuth = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN || "",
      server: getPolarServer(),
    });
  }
  return _polarClientAuth;
};

const authCookieDomain = getAuthCookieDomain();
const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  rateLimit: {
    window: 60, // time window in seconds
    max: 100, // max requests in the window
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 100,
    password: {
      // Default scrypt hashing, gated by the server-side complexity policy.
      hash: async (password: string) => {
        validatePasswordStrength(password);
        return hashPassword(password);
      },
    },
    sendResetPassword: async ({ user, url }) => {
      const token = resolveTokenFromUrl(url);

      if (!token) {
        console.error("Failed to extract token from reset password URL:", url);
        return;
      }

      const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      const htmlTemplate = templates["reset-password"]({
        email: user.email,
        resetUrl,
        token,
      });

      await sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        text: `Please click the following link to reset your password: ${resetUrl}`,
        html: htmlTemplate,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      const callbackUrl = process.env.EMAIL_VERIFICATION_CALLBACK || "/app";
      const verificationUrl = `${getAppBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(callbackUrl)}`;
      const htmlTemplate = templates["verification"]({
        verificationUrl,
        token,
      });

      await sendEmail({
        to: user.email,
        subject: "Verify Your Email",
        text: `Please click the following link to verify your email: ${verificationUrl}`,
        html: htmlTemplate,
      });
    },
  },
  socialProviders: resolveSocialProviders(),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    freshAge: 60 * 60 * 24, // 1 day
  },
  baseURL: process.env.BETTER_AUTH_URL,
  advanced: {
    // Production cookies must be Secure + scoped to the parent domain so
    // app.slugy.co and slugy.co share the session across tab reopens.
    useSecureCookies: isProd,
    ...(authCookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: authCookieDomain,
          },
        }
      : {}),
    defaultCookieAttributes: {
      sameSite: "lax" as const,
      path: "/",
      httpOnly: true,
      ...(isProd ? { secure: true } : {}),
    },
    trustedOrigins: origins,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const htmlTemplate = templates["login-link"]({ url });

        await sendEmail({
          to: email,
          subject: "Sign in to slugy",
          text: `You requested a magic link to sign in to your slugy account. Click the following link to log in: ${url}`,
          html: htmlTemplate,
        });
      },
      expiresIn: 300, // 5 minutes
    }),
    polar({
      client: getPolarClient(),
      createCustomerOnSignUp: false,
      use: [
        checkout({
          products: [],
        }),
      ],
    }),
    organization({
      allowUserToCreateOrganization: true,
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.NEXT_APP_URL}/accept-invitation/${data.id}`;
        await sendOrganizationInvitation({
          email: data.email,
          invitedByUsername: data.inviter.user.name,
          invitedByEmail: data.inviter.user.email,
          teamName: data.organization.name,
          inviteLink,
        });
      },
    }),
    admin(),
    nextCookies(),
  ],
});

export const getUserByEmail = async (email: string) => {
  try {
    return await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        accounts: {
          select: {
            providerId: true,
          },
        },
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to retrieve user by email:", error);
    }
    return null;
  }
};

export type Session = typeof auth.$Infer.Session;

// Cached session
const getCachedSession = cache(async (): Promise<Session | null> => {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Session fetch error:", error);
    }
    return null;
  }
});

// Cached session for root route
export async function getCachedRootSession(): Promise<Session | null> {
  return await getCachedSession();
}

// Cached session for authenticated routes
export async function getAuthSession(): Promise<
  { success: true; session: Session } | { success: false; redirectTo: string }
> {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    // Clear stale cookies before showing login (avoids /login ↔ / redirect loops).
    return { success: false, redirectTo: "/api/auth/session-cleanup" } as const;
  }

  // Banned users stay "logged in" at the cookie level — enforce here so every
  // page/layout/server-action behind getAuthSession() locks them out, and
  // revoke their sessions so the ban sticks.
  if (await isUserBanned(session.user.id, session.user)) {
    try {
      await db.session.deleteMany({ where: { userId: session.user.id } });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to revoke banned user sessions:", error);
      }
    }
    return { success: false, redirectTo: "/api/auth/session-cleanup" } as const;
  }

  return { success: true, session } as const;
}

/**
 * Ban check for the `admin()` plugin's `banned/banExpires` columns.
 * better-auth does not enforce bans on session validation, so every auth
 * gate must call this. An expired `banExpires` lifts the ban (grace).
 */
export async function isUserBanned(
  userId: string,
  sessionUser?: {
    banned?: boolean | null;
    banExpires?: Date | string | number | null;
  } | null,
): Promise<boolean> {
  let banned = sessionUser?.banned;
  let banExpires = sessionUser?.banExpires;

  // Session payloads don't always carry admin columns — fall back to DB.
  if (typeof banned !== "boolean") {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { banned: true, banExpires: true },
      });
      if (!user) return true; // User vanished mid-session — treat as invalid.
      banned = user.banned;
      banExpires = user.banExpires;
    } catch {
      return false; // Fail open on DB outage; next request re-checks.
    }
  }

  if (!banned) return false;
  if (banExpires && new Date(banExpires).getTime() <= Date.now()) return false;
  return true;
}
