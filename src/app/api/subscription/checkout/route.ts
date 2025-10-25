import { NextResponse } from "next/server";
import { polarClient } from "@/lib/polar"; // Import your existing `polarApi` instance
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    // Debug: Log all headers to see what's being sent
    const headersList = await headers();
    const cookie = headersList.get("cookie");
    const authorization = headersList.get("authorization");

    // Get session using the original approach
    const session = await auth.api.getSession({
      headers: await headers(),
      //
    });

    if (!session) {
      return NextResponse.json(
        {
          error: "Unauthorized - No session",
          debug: {
            cookies: cookie,
            hasAuth: !!authorization,
            url: req.url,
          },
        },
        { status: 401 },
      );
    }

    if (!session.user) {
      return NextResponse.json(
        { error: "Unauthorized - No user" },
        { status: 401 },
      );
    }

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const successUrl = `http://app.localhost:3000/confirmation?checkoutId={CHECKOUT_ID}`;

    // Create checkout session with Polar
    const checkoutSession = await polarClient.checkouts.create({
      products: [productId],
      customerEmail: session.user.email,
      customerName: session.user.name,
      successUrl,
    } as any);

    // Redirect user to the Polar checkout page
    return NextResponse.redirect(checkoutSession.url);
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
