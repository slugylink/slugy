import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
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

const getPolarServer = () =>
  process.env.NODE_ENV === "production" ? "production" : "sandbox";

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
    afterEmailVerification: async (userData: { id: string; email: string }) => {
      const userWithCreatedAt = await db.user.findUnique({
        where: { id: userData.id },
        select: {
          createdAt: true,
          emailVerified: true,
          name: true,
        },
      });

      if (!userWithCreatedAt) return;

      // If user was created within the last hour, send them a welcome email
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (userWithCreatedAt.createdAt > oneHourAgo) {
        const dashboardUrl = `${getAppBaseUrl()}/login`;
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
  { success: true; session: Session } | { success: false; redirectTo: "/login" }
> {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    return { success: false, redirectTo: "/login" } as const;
  }

  return { success: true, session } as const;
}
