import { auth } from '@/lib/auth';
import { Checkout } from '@polar-sh/nextjs'
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'

export async function GET(req: NextRequest) {
  // Authenticate user
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user info from database
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { 
      customerId: true,
      email: true,
      name: true,
      id: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Build URL with customer info query params
  // Polar Checkout handler automatically reads query params from the request URL:
  // - products (required): ?products=123 or ?products=123&products=456 (multiple params)
  // - customerId (optional): ?customerId=xxx
  // - customerExternalId (optional): ?customerExternalId=xxx
  // - customerEmail (optional): ?customerEmail=user@example.com
  // - customerName (optional): ?customerName=Jane
  // - metadata (optional): URL-Encoded JSON string
  
  const url = new URL(req.url);
  
  // Handle products parameter - split comma-separated values into multiple params
  // Polar SDK expects products as an array, so we need separate query params
  const productsParam = url.searchParams.get('products');
  if (productsParam) {
    // Remove the original products parameter
    url.searchParams.delete('products');
    
    // Split by comma and add each product ID as a separate 'products' parameter
    // This allows Polar SDK to properly parse it as an array
    const productIds = productsParam.split(',').map(id => id.trim()).filter(Boolean);
    productIds.forEach(productId => {
      url.searchParams.append('products', productId);
    });
  }
  
  // Set customer info if not already provided in query params
  if (user.customerId && !url.searchParams.has('customerId')) {
    url.searchParams.set('customerId', user.customerId);
  }
  if (!url.searchParams.has('customerExternalId')) {
    url.searchParams.set('customerExternalId', user.id);
  }
  if (user.email && !url.searchParams.has('customerEmail')) {
    url.searchParams.set('customerEmail', user.email);
  }
  if (user.name && !url.searchParams.has('customerName')) {
    url.searchParams.set('customerName', user.name);
  }

  // Add metadata with userId for webhook processing
  if (!url.searchParams.has('metadata')) {
    const metadata = { userId: user.id };
    url.searchParams.set('metadata', JSON.stringify(metadata));
  }

  // Create new request with updated URL
  const updatedReq = new NextRequest(url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  return await Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: (process.env.POLAR_MODE as "sandbox" | "production") || "sandbox",
    successUrl: process.env.POLAR_SUCCESS_URL || (process.env.NODE_ENV === "production" 
      ? "https://app.slugy.co/" 
      : "http://app.localhost:3000/"),
    returnUrl: process.env.NODE_ENV === "production" 
      ? "https://app.slugy.co" 
      : "http://app.localhost:3000",
  })(updatedReq)
}