import { CustomerPortal } from "@polar-sh/nextjs";
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const MIN_TOKEN_LENGTH = 20;
const DEFAULT_SANDBOX_MODE = "sandbox";
const PRODUCTION_URL = "https://app.slugy.co";
const DEVELOPMENT_URL = "http://app.localhost:3000";

interface PolarError {
  statusCode: number;
  body: string;
  detail?: Array<{ msg: string; loc: string[] }>;
}

// Validate Polar access token
function validatePolarToken(token: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!token) return { valid: false, error: "POLAR_ACCESS_TOKEN is not set" };
  if (token.length < MIN_TOKEN_LENGTH)
    return { valid: false, error: "POLAR_ACCESS_TOKEN appears to be invalid" };
  return { valid: true };
}

// Get base URL based on environment
function getBaseUrl(): string {
  if (process.env.NODE_ENV === "production") {
    return process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL;
  }
  return DEVELOPMENT_URL;
}

// Construct full return URL
function getReturnUrl(path?: string): string {
  const baseUrl = getBaseUrl();
  return path ? `${baseUrl}${path}` : `${baseUrl}/`;
}

// Get customer ID from authenticated session
async function getCustomerId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const { db } = await import("@/server/db");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { customerId: true },
  });

  if (!user?.customerId) {
    throw new Error("No customer ID found");
  }

  if (
    typeof user.customerId !== "string" ||
    user.customerId.trim().length === 0
  ) {
    throw new Error("Invalid customer ID");
  }

  return user.customerId;
}

// Create error response for unconfigured service
function createUnconfiguredServiceResponse(): NextResponse {
  return NextResponse.json(
    { error: "Customer portal service is not configured properly" },
    { status: 503 },
  );
}

// Create Polar CustomerPortal handler
function createPortalHandler(
  returnUrl: string,
): ReturnType<typeof CustomerPortal> {
  const tokenValidation = validatePolarToken(process.env.POLAR_ACCESS_TOKEN);

  if (!tokenValidation.valid) {
    return async () => createUnconfiguredServiceResponse();
  }

  return CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    returnUrl,
    server:
      (process.env.POLAR_MODE as "sandbox" | "production") ||
      DEFAULT_SANDBOX_MODE,
    getCustomerId: async () => {
      try {
        return await getCustomerId();
      } catch (error) {
        console.error(
          "[Subscription Manage] Error getting customer ID:",
          error,
        );
        throw error;
      }
    },
  });
}

// Cache for default handler (no custom returnUrl)
let cachedHandler: ReturnType<typeof CustomerPortal> | null = null;

// Get or create handler
function getHandler(returnPath?: string): ReturnType<typeof CustomerPortal> {
  const returnUrl = getReturnUrl(returnPath);

  // Use cached handler for default behavior
  if (!returnPath) {
    if (!cachedHandler) {
      cachedHandler = createPortalHandler(returnUrl);
    }
    return cachedHandler;
  }

  // Create new handler for custom return URL
  return createPortalHandler(returnUrl);
}

// Check if error is a Polar API error
function isPolarError(error: unknown): error is PolarError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "body" in error
  );
}

// Handle Polar API errors
function handlePolarError(error: PolarError): NextResponse {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Customer doesn't exist
  if (
    error.statusCode === 422 &&
    error.detail?.some(
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
      ...(isDevelopment && { details: error.body }),
    },
    { status: error.statusCode || 500 },
  );
}

// Handle standard errors
function handleStandardError(error: Error): NextResponse {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Unauthorized
  if (error.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // No customer ID
  if (error.message === "No customer ID found") {
    return NextResponse.json(
      { error: "No subscription found. Please create a subscription first." },
      { status: 404 },
    );
  }

  // Generic error
  return NextResponse.json(
    {
      error: "Failed to access subscription portal",
      ...(isDevelopment && { details: error.message }),
    },
    { status: 500 },
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const returnPath = searchParams.get("returnUrl") || undefined;

    const handler = getHandler(returnPath);
    return await handler(req);
  } catch (error: unknown) {
    console.error("[Subscription Manage] Error:", error);

    // Handle Polar API errors
    if (isPolarError(error)) {
      return handlePolarError(error);
    }

    // Handle standard errors
    if (error instanceof Error) {
      return handleStandardError(error);
    }

    // Unknown error
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
