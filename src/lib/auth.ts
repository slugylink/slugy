import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { cache } from "react";
import { magicLink, admin, organization } from "better-auth/plugins";
import { sendMagicLinkEmail } from "@/utils/magiclink";
import { db } from "@/server/db";
import { sendEmail, sendOrganizationInvitation } from "@/server/actions/email";
import { polar, checkout } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { origins } from "@/constants/origins";
import {
  getTemporarySession,
  setTemporarySession,
  invalidateSessionPattern,
  hashKey,
} from "@/lib/redis";

let _polarClientAuth: Polar | null = null;

const getPolarClient = () => {
  if (!_polarClientAuth) {
    _polarClientAuth = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN || "",
      server: "sandbox",
    });
  }
  return _polarClientAuth;
};

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
    sendResetPassword: async ({ user, url }) => {
      const tokenMatch = url.match(/\/reset-password\/([^?]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (!token) {
        console.error("Failed to extract token from reset password URL:", url);
        return;
      }

      const resetUrl = `${process.env.BETTER_AUTH_URL}/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Please click the following link to reset your password: ${resetUrl}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      const verificationUrl = `${process.env.NEXT_BASE_URL}/api/auth/verify-email?token=${token}&callbackURL=${process.env.EMAIL_VERIFICATION_CALLBACK}`;
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        text: `Please click the following link to verify your email: ${verificationUrl}`,
      });
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    freshAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    trustedOrigins: origins,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
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

// Session cache configuration
const SESSION_CACHE_TTL = 60 * 15; // 15 minutes - shorter than session expiry for safety
const SESSION_CACHE_PREFIX = "sess:data:";

// Helper to generate Redis cache key from cookie header
// Uses hash of cookie header to create a stable cache key
function getSessionCacheKey(cookieHeader: string): string {
  return `${SESSION_CACHE_PREFIX}${hashKey(cookieHeader)}`;
}

// Invalidate session cache for a specific user
export async function invalidateSessionCache(userId: string): Promise<void> {
  try {
    // Invalidate all session caches for this user
    // Note: This is a broad invalidation; for more precise control,
    // you could maintain a user->session mapping in Redis
    await invalidateSessionPattern(`${SESSION_CACHE_PREFIX}*`);
  } catch (error) {
    // Best-effort cache invalidation; don't fail if Redis is unavailable
    if (process.env.NODE_ENV === "development") {
      console.warn("Session cache invalidation failed:", error);
    }
  }
}

// Base cached session lookup with Redis + React cache
// Layered caching: React cache (request-level) -> Redis (cross-request) -> Database
const getCachedSession = cache(async (): Promise<Session | null> => {
  try {
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie") ?? "";

    // Try Redis cache first if we have cookies
    if (cookieHeader) {
      const cacheKey = getSessionCacheKey(cookieHeader);
      const cachedSession = await getTemporarySession<Session>(cacheKey);
      if (cachedSession) {
        return cachedSession;
      }
    }

    // Cache miss - fetch from database via better-auth
    const session = await auth.api.getSession({
      headers: headersList,
    });

    // Cache the session in Redis if we have cookies and a valid session
    if (session && cookieHeader) {
      const cacheKey = getSessionCacheKey(cookieHeader);
      // Use shorter TTL than session expiry for safety
      await setTemporarySession(cacheKey, session, SESSION_CACHE_TTL);
    }

    return session;
  } catch (error) {
    // Only log in development to avoid noise in production
    if (process.env.NODE_ENV === "development") {
      console.error("Session fetch error:", error);
    }
    return null;
  }
});

// Cached session for root/public layouts (non-critical)
// Returns null if no session exists, allowing graceful degradation
export async function getCachedRootSession(): Promise<Session | null> {
  return await getCachedSession();
}

// Optimized session getter for protected routes/API routes
// Uses layered caching (React cache + Redis) to prevent duplicate fetches
// Returns a discriminated union for type-safe handling
export async function getAuthSession(): Promise<
  | { success: true; session: Session }
  | { success: false; redirectTo: "/login" }
> {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    return { success: false, redirectTo: "/login" } as const;
  }

  return { success: true, session } as const;
}