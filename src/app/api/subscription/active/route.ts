import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getActiveSubscription } from "@/server/actions/subscription";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          msg: "Unauthorized",
          status: false,
          subscription: null,
        },
        { status: 401 },
      );
    }

    const result = await getActiveSubscription(session.user.id);

    // Always return 200 for easier client handling; use `status` flag in body.
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching active subscription:", error);
    return NextResponse.json(
      {
        msg: "Failed to fetch subscription",
        status: false,
        subscription: null,
      },
      { status: 500 },
    );
  }
}

