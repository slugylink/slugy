import { auth } from "@/lib/auth";
import { Checkout } from "@polar-sh/nextjs";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

const POLAR_MODE =
  (process.env.POLAR_MODE as "sandbox" | "production") || "sandbox";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEFAULT_SUCCESS_URL = IS_PRODUCTION
  ? "https://app.slugy.co/"
  : "http://app.localhost:3000/";
const RETURN_URL = IS_PRODUCTION
  ? "https://app.slugy.co"
  : "http://app.localhost:3000";

interface UserData {
  id: string;
  email: string | null;
  name: string | null;
  customerId: string | null;
}

// Split comma-separated product IDs into array
function parseProductIds(productsParam: string | null): string[] {
  if (!productsParam) return [];
  return productsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

// Add customer information to URL params
function addCustomerParams(url: URL, user: UserData): void {
  if (!url.searchParams.has("customerExternalId")) {
    url.searchParams.set("customerExternalId", user.id);
  }

  if (user.email && !url.searchParams.has("customerEmail")) {
    url.searchParams.set("customerEmail", user.email);
  }

  if (user.name && !url.searchParams.has("customerName")) {
    url.searchParams.set("customerName", user.name);
  }
}

// Add metadata with userId for webhook processing
function addMetadata(url: URL, userId: string): void {
  if (!url.searchParams.has("metadata")) {
    url.searchParams.set("metadata", JSON.stringify({ userId }));
  }
}

// Convert comma-separated products param to multiple query params
function handleProductsParam(url: URL): void {
  const productsParam = url.searchParams.get("products");
  if (!productsParam) return;

  // Remove original parameter
  url.searchParams.delete("products");

  // Add each product ID as separate parameter (Polar SDK expects array)
  const productIds = parseProductIds(productsParam);
  productIds.forEach((productId) => {
    url.searchParams.append("products", productId);
  });
}

// Build updated URL with all necessary parameters
function buildCheckoutUrl(req: NextRequest, user: UserData): URL {
  const url = new URL(req.url);

  // Store the successUrl parameter before modifying the URL
  const successUrlParam = url.searchParams.get("successUrl");

  handleProductsParam(url);
  addCustomerParams(url, user);
  addMetadata(url, user.id);

  // Restore the successUrl parameter if it was removed
  if (successUrlParam && !url.searchParams.has("successUrl")) {
    url.searchParams.set("successUrl", successUrlParam);
  }

  return url;
}

// Get success URL from query params or use default
function getSuccessUrl(req: NextRequest): string {
  const { searchParams } = new URL(req.url);
  const successUrlParam = searchParams.get("successUrl");

  if (successUrlParam) {
    const baseUrl = IS_PRODUCTION
      ? "https://app.slugy.co"
      : "http://app.localhost:3000";
    return `${baseUrl}${successUrlParam}`;
  }

  return DEFAULT_SUCCESS_URL;
}

// Fetch user from database
async function getUser(userId: string): Promise<UserData | null> {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      customerId: true,
    },
  });
}

export async function GET(req: NextRequest) {
  // Authenticate user
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user from database
  const user = await getUser(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Build checkout URL with customer info and products
  const checkoutUrl = buildCheckoutUrl(req, user);

  // Create updated request
  const updatedReq = new NextRequest(checkoutUrl, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  // Call Polar checkout handler
  return await Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: POLAR_MODE,
    successUrl: getSuccessUrl(req),
    returnUrl: RETURN_URL,
  })(updatedReq);
}
