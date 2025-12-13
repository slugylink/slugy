import { CustomerPortal } from "@polar-sh/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Validate Polar access token
const validatePolarToken = (token: string | undefined) => {
  if (!token) return { valid: false, error: "POLAR_ACCESS_TOKEN is not set" };
  if (token.length < 20) return { valid: false, error: "POLAR_ACCESS_TOKEN appears to be invalid" };
  return { valid: true };
};

const tokenValidation = validatePolarToken(process.env.POLAR_ACCESS_TOKEN);

// Get return URL based on environment
const getReturnUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
      : "https://app.slugy.co/settings/billing";
  }
  return "http://app.localhost:3000/settings/billing";
};

export const GET = tokenValidation.valid
  ? CustomerPortal({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      returnUrl: getReturnUrl(),
      server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      // Get customer ID from authenticated user
      getCustomerId: async () => {
        try {
          const session = await auth.api.getSession({
            headers: await headers(),
          });

          if (!session?.user?.id) {
            throw new Error("Unauthorized");
          }

          // Get user's customer ID from database
          const { db } = await import("@/server/db");
          const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { customerId: true },
          });

          if (!user?.customerId) {
            throw new Error("No customer ID found");
          }

          return user.customerId;
        } catch (error) {
          console.error("Error getting customer ID:", error);
          throw error;
        }
      },
    })
  : async () => {
      return NextResponse.json(
        { error: "Customer portal service is not configured properly" },
        { status: 503 }
      );
    };

