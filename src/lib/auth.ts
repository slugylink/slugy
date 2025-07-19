import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink, admin, organization } from "better-auth/plugins";
import { sendMagicLinkEmail } from "@/utils/magiclink";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { sendEmail, sendOrganizationInvitation } from "@/server/actions/email";
import { polar, checkout } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: "sandbox",
});

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
      // Extract token from the URL path
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
      // redirectUri: `${process.env.BETTER_AUTH_URL}/api/auth/callback/github`,
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
    cookieCache: {
      enabled: true,
      maxAge: 60 * 10, // 10 minutes
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env
        .NEXT_BASE_URL!.replace("http://", "")
        .replace("https://", ""),
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      },
      expiresIn: 300, // 5 minutes
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
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

export const currentSessionUser = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export const getCurrentUser = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) return null;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

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

export const getUserById = async (id: string | undefined) => {
  if (!id) return null;

  try {
    return await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to retrieve user by ID:", error);
    }
    return null;
  }
};

export type Session = typeof auth.$Infer.Session;
