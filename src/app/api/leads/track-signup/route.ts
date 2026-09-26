import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { recordSignupLead } from "@/server/actions/leads/record-signup-lead";

const bodySchema = z.object({
  clickId: z.string().min(1).max(255).optional().nullable(),
});

/**
 * Authenticated self-attribution: the logged-in user reports their own
 * ?slugy_id (or slugy_id cookie) as a sign_up lead. Workspace is resolved
 * from the click — no API key required.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let clickId: string | null = null;
  try {
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (parsed.success) clickId = parsed.data.clickId ?? null;
  } catch {
    // empty body — fall back to slugy_id cookie inside recordSignupLead
  }

  const queryClickId = request.nextUrl.searchParams.get("clickId");
  const result = await recordSignupLead({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    clickId: clickId ?? queryClickId,
  });

  if (!result.ok) {
    // No attribution on organic signups is normal — don't error the client.
    if (
      result.reason === "no-attribution" ||
      result.reason === "unknown-click"
    ) {
      return NextResponse.json({ tracked: false, reason: result.reason });
    }
    return NextResponse.json(
      { tracked: false, reason: result.reason },
      { status: 422 },
    );
  }

  return NextResponse.json(
    {
      tracked: true,
      leadEventId: result.leadEventId,
      idempotent: result.idempotent,
    },
    { status: result.idempotent ? 200 : 201 },
  );
}
