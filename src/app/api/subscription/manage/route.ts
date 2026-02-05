import { CustomerPortal } from "@polar-sh/nextjs";
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Validate Polar access token
const validatePolarToken = (token: string | undefined) => {
  if (!token) return { valid: false, error: "POLAR_ACCESS_TOKEN is not set" };
  if (token.length < 20) return { valid: false, error: "POLAR_ACCESS_TOKEN appears to be invalid" };
  return { valid: true };
};

// Lazy initialization to avoid build-time evaluation
let _handler: ReturnType<typeof CustomerPortal> | null = null;

function getHandler() {
  if (_handler) return _handler;

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

  _handler = tokenValidation.valid
    ? CustomerPortal({
        accessToken: process.env.POLAR_ACCESS_TOKEN!,
        returnUrl: getReturnUrl(),
        server: (process.env.POLAR_MODE as "sandbox" | "production") || "sandbox",
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

            // Validate customer ID format
            if (
              typeof user.customerId !== "string" ||
              user.customerId.trim().length === 0
            ) {
              throw new Error("Invalid customer ID");
            }

            return user.customerId;
          } catch (error) {
            console.error("[Subscription Manage] Error getting customer ID:", error);
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

  return _handler;
}

export async function GET(req: NextRequest) {
  try {
    const handler = getHandler();
    const response = await handler(req);
    return response;
  } catch (error: unknown) {
    console.error("[Subscription Manage] Error:", error);

    // Handle Polar API errors
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      "body" in error
    ) {
      const polarError = error as {
        statusCode: number;
        body: string;
        detail?: Array<{ msg: string; loc: string[] }>;
      };

      // Customer doesn't exist in Polar
      if (
        polarError.statusCode === 422 &&
        polarError.detail?.some(
          (d) =>
            d.msg.includes("Customer does not exist") ||
            d.loc.includes("customer_id"),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Customer account not found. Please contact support or create a new subscription.",
          },
          { status: 404 },
        );
      }

      // Other Polar API errors
      return NextResponse.json(
        {
          error: "Failed to access subscription portal",
          details:
            process.env.NODE_ENV === "development"
              ? polarError.body
              : undefined,
        },
        { status: polarError.statusCode || 500 },
      );
    }

    // Handle generic errors
    if (error instanceof Error) {
      // Unauthorized errors
      if (error.message === "Unauthorized") {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
      }

      // No customer ID errors
      if (error.message === "No customer ID found") {
        return NextResponse.json(
          {
            error:
              "No subscription found. Please create a subscription first.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to access subscription portal",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        { status: 500 },
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

