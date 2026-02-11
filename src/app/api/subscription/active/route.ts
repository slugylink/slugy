import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getActiveSubscription } from "@/server/actions/subscription";
import { jsonWithETag } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return jsonWithETag(
        req,
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
    return jsonWithETag(req, result, { status: 200 });
  } catch (error) {
    console.error("Error fetching active subscription:", error);
    return jsonWithETag(
      req,
      {
        msg: "Failed to fetch subscription",
        status: false,
        subscription: null,
      },
      { status: 500 },
    );
  }
}
