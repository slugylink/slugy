import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { apiErrors, apiSuccess } from "@/lib/api-response";
import { authenticateWorkspaceApiKey } from "@/lib/workspace-api-key";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

function withCors<T extends Response>(response: T): T {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

const conversionSchema = z
  .object({
    linkId: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    domain: z.string().min(1).optional(),
    type: z.enum(["conversion", "lead"]).default("conversion"),
    count: z.number().int().min(1).max(1000).default(1),
    clickId: z.string().min(1).max(255).optional(),
  })
  .refine((value) => value.linkId || value.slug, {
    message: "Provide either linkId or slug",
    path: ["linkId"],
  });

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateWorkspaceApiKey(req);

    if (!authResult.ok) {
      switch (authResult.reason) {
        case "missing":
          return withCors(
            apiErrors.unauthorized(
              "Missing API key. Use Authorization: Bearer <key> or x-api-key.",
            ),
          );
        case "expired":
          return withCors(apiErrors.unauthorized("API key expired"));
        case "insufficient_permissions":
          return withCors(
            apiErrors.forbidden(
              "This API key does not have link write permission",
            ),
          );
        default:
          return withCors(apiErrors.unauthorized("Invalid API key"));
      }
    }

    const body = await req.json();
    const parsed = conversionSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        apiErrors.validationError(
          parsed.error.flatten(),
          "Invalid conversion payload",
        ),
      );
    }

    const { apiKey } = authResult;
    const { linkId, slug, domain, type, count, clickId } = parsed.data;

    const link = await db.link.findFirst({
      where: {
        workspaceId: apiKey.workspaceId,
        ...(linkId
          ? { id: linkId }
          : {
              slug,
              domain: domain || "slugy.co",
            }),
      },
      select: {
        id: true,
        slug: true,
        domain: true,
        conversions: true,
        leads: true,
      },
    });

    if (!link) {
      return withCors(
        apiErrors.notFound("Link not found for this workspace API key"),
      );
    }

    const updatedLink = await db.link.update({
      where: { id: link.id },
      data: {
        ...(type === "conversion"
          ? { conversions: { increment: count } }
          : { leads: { increment: count } }),
      },
      select: {
        id: true,
        slug: true,
        domain: true,
        conversions: true,
        leads: true,
      },
    });

    return apiSuccess(
      {
        tracked: {
          type,
          count,
          clickId: clickId ?? null,
        },
        workspace: {
          id: apiKey.workspace.id,
          slug: apiKey.workspace.slug,
        },
        link: updatedLink,
      },
      "Conversion tracked successfully",
      200,
      CORS_HEADERS,
    );
  } catch (error) {
    console.error("[Public Conversion API] Error:", error);
    return withCors(apiErrors.internalError("Failed to track conversion"));
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
