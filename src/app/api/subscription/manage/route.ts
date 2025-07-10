import { NextResponse } from "next/server";
import { polarClient } from "@/lib/polar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST() {
  try {
    // Get session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has an active subscription (optional: implement logic if needed)
    // For now, assume all logged-in users can access the portal
    // If you want to check for active subscription, query your DB or Polar API here

    // Create a customer session for the portal
    const result = await polarClient.customerSessions.create({
      customerExternalId: session.user.id,
    });

    if (!result.customerPortalUrl) {
      return NextResponse.json({ error: "Failed to get portal URL" }, { status: 500 });
    }

    return NextResponse.json({ url: result.customerPortalUrl });
  } catch (error) {
    console.error("Manage subscription error:", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
} 