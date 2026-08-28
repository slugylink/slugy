import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrors, apiSuccess } from "@/lib/api-response";
import { authenticateApiKey } from "@/lib/api-keys/auth";
import { trackLead } from "@/lib/leads/record-lead";
import {
  canUseLeadTracking,
  getWorkspaceOwnerPlanType,
} from "@/lib/subscription/entitlements";

const trackLeadSchema = z.object({
  clickId: z.string().min(1),
  eventName: z.string().min(1).max(120),
  customerExternalId: z.string().min(1).max(255),
  customerEmail: z.string().email().optional().nullable(),
  customerName: z.string().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
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
      return apiErrors.forbidden("Lead tracking requires a Pro plan.");
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
