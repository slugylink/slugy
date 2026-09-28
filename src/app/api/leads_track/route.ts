import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrors, apiSuccess } from "@/lib/api-response";
import { authenticateApiKey } from "@/lib/api-keys/auth";
import { checkLeadTrackRateLimit } from "@/lib/middleware/rate-limit";
import { trackLead } from "@/lib/leads/record-lead";
import {
  canUseLeadTracking,
  canUseSalesAnalytics,
  getWorkspaceOwnerPlanType,
} from "@/lib/subscription/entitlements";

const trackLeadSchema = z.object({
  clickId: z.string().min(1),
  eventName: z.string().min(1).max(120),
  customerExternalId: z.string().min(1).max(255),
  customerEmail: z.string().email().optional().nullable(),
  customerName: z.string().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  saleAmount: z.number().positive().max(1000000000).optional().nullable(),
  saleCurrency: z.string().min(3).max(3).optional().nullable(),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(
      request.headers.get("authorization"),
      "write",
    );
    if (!auth.ok) {
      return apiErrors[auth.status === 401 ? "unauthorized" : "forbidden"](
        auth.message,
      );
    }

    const ownerPlanType = await getWorkspaceOwnerPlanType(
      auth.apiKey.workspaceId,
    );
    if (!canUseLeadTracking(ownerPlanType)) {
      return apiErrors.forbidden(
        "Lead tracking requires a Pro or Growth plan.",
      );
    }

    // Per-key throttle (300/min): each call is several DB writes + Tinybird,
    // so a leaked key must degrade to 429, not burn quota.
    const leadLimit = await checkLeadTrackRateLimit(auth.apiKey.id);
    if (!leadLimit.success) {
      return apiErrors.rateLimitExceeded(
        Math.max(1, Math.ceil((leadLimit.reset - Date.now()) / 1000)),
      );
    }

    // Revoked-workspace keys die with the workspace (authenticateApiKey only
    // checks the key row itself).
    const { db } = await import("@/server/db");
    const workspaceAlive = await db.workspace.findFirst({
      where: { id: auth.apiKey.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!workspaceAlive) {
      return apiErrors.notFound("Workspace not found");
    }

    const queryClickId = request.nextUrl.searchParams.get("clickId");
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text.trim()) body = JSON.parse(text);
    } catch {
      return apiErrors.badRequest("Invalid JSON body");
    }

    const merged =
      typeof body === "object" && body !== null
        ? {
            ...(body as Record<string, unknown>),
            clickId:
              (body as Record<string, unknown>).clickId ?? queryClickId ?? "",
          }
        : { clickId: queryClickId ?? "" };

    const parsed = trackLeadSchema.safeParse(merged);
    if (!parsed.success) {
      return apiErrors.validationError(parsed.error.flatten());
    }

    // Revenue attribution (sales) is Growth only.
    if (
      parsed.data.saleAmount != null &&
      !canUseSalesAnalytics(ownerPlanType)
    ) {
      return apiErrors.forbidden("Sales attribution requires a Growth plan.");
    }

    const result = await trackLead(auth.apiKey.workspaceId, parsed.data);
    if (!result.ok) {
      if (result.status === 404) return apiErrors.notFound(result.message);
      if (result.status === 422) {
        return apiErrors.unprocessableEntity(result.message);
      }
      return apiErrors.conflict(result.message);
    }

    return apiSuccess(
      {
        leadEventId: result.leadEventId,
        idempotent: result.idempotent,
      },
      result.idempotent ? "Lead already recorded" : "Lead recorded",
      result.idempotent ? 200 : 201,
      CORS_HEADERS,
    );
  } catch (error) {
    console.error("[leads_track]", error);
    return apiErrors.internalError();
  }
}
