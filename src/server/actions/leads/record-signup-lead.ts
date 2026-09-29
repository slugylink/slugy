import { cookies } from "next/headers";
import { SLUGY_ID_COOKIE } from "@/lib/leads/constants";
import { resolveClickAttribution } from "@/lib/leads/click-cache";
import { trackLead } from "@/lib/leads/record-lead";
import { db } from "@/server/db";

export const SIGNUP_EVENT_NAME = "sign_up";

export interface RecordSignupLeadInput {
  userId: string;
  email?: string | null;
  name?: string | null;
  clickId?: string | null;
}

/**
 * Attribute a Slugy signup back to the short link that drove it.
 * Resolves the click's workspace from attribution and calls trackLead()
 * directly (no SLUGY_API_KEY needed for our own product conversions).
 * Never throws — lead tracking must not break signup.
 */
export async function recordSignupLead(input: RecordSignupLeadInput) {
  try {
    const userId = input.userId.trim();
    if (!userId) return { ok: false as const, reason: "missing-user" };

    let clickId = input.clickId?.trim() || "";
    if (!clickId) {
      clickId = (await cookies()).get(SLUGY_ID_COOKIE)?.value?.trim() ?? "";
    }
    if (!clickId) return { ok: false as const, reason: "no-attribution" };

    const attribution = await resolveClickAttribution(clickId);
    if (!attribution) return { ok: false as const, reason: "unknown-click" };

    // Self-conversion guard: the workspace owner / team members clicking
    // their own links (e.g. logged in on their own device) must not create
    // leads. Only genuinely new users count.
    try {
      const [workspace, membership] = await Promise.all([
        db.workspace.findUnique({
          where: { id: attribution.workspaceId },
          select: { userId: true },
        }),
        db.member.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: attribution.workspaceId,
              userId,
            },
          },
          select: { id: true },
        }),
      ]);
      if (workspace?.userId === userId || membership) {
        return { ok: false as const, reason: "self-conversion" };
      }
    } catch {
      // Fail open: never break signup on a guard lookup failure.
    }

    const result = await trackLead(attribution.workspaceId, {
      clickId,
      eventName: SIGNUP_EVENT_NAME,
      customerExternalId: userId,
      customerEmail: input.email?.trim() || null,
      customerName: input.name?.trim() || null,
      metadata: { source: "slugy_signup" },
    });

    if (!result.ok) return { ok: false as const, reason: result.message };
    return {
      ok: true as const,
      leadEventId: result.leadEventId,
      idempotent: result.idempotent,
    };
  } catch (error) {
    console.error("[recordSignupLead]", error);
    return { ok: false as const, reason: "internal-error" };
  }
}
