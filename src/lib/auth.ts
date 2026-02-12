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
import { templates } from "@/constants/email-templates";

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
      const verificationUrl = `${process.env.NEXT_BASE_URL}/api/auth/verify-email?token=${token}&callbackURL=${process.env.EMAIL_VERIFICATION_CALLBACK}`;
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
    afterEmailVerification: async (userData: { id: string; email: string }) => {
      // Check if this is the first time verification (user was just created)
      const userWithCreatedAt = await db.user.findUnique({
        where: { id: userData.id },
        select: {
          createdAt: true,
          emailVerified: true,
          name: true,
        },
      });

      if (!userWithCreatedAt) return;

      // Only send welcome email if user was created recently (within last hour)
      // This prevents sending welcome emails on re-verification
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (userWithCreatedAt.createdAt > oneHourAgo) {
        const dashboardUrl = `${process.env.NEXT_APP_URL || process.env.NEXT_BASE_URL}/login`;
        const welcomeTemplate = templates["welcome"]({
          name: userWithCreatedAt.name || "there",
          dashboardUrl,
        });

        await sendEmail({
          to: userData.email,
          subject: "Welcome to slugy!",
          text: `Welcome to slugy! You can now start creating short links, track analytics, and explore bio links. Visit your dashboard at ${dashboardUrl}`,
          html: welcomeTemplate,
        });
      }
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

// Base cached session lookup - uses React's cache() to deduplicate session fetches
// within the same request/render cycle, preventing duplicate database calls
const getCachedSession = cache(async (): Promise<Session | null> => {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
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
// Uses React's cache() to prevent duplicate fetches within the same request
// Returns a discriminated union for type-safe handling
export async function getAuthSession(): Promise<
  { success: true; session: Session } | { success: false; redirectTo: "/login" }
> {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    return { success: false, redirectTo: "/login" } as const;
  }

  return { success: true, session } as const;
}
