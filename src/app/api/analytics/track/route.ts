import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { z } from "zod";
import { jsonWithETag } from "@/lib/http";
import { apiSuccessPayload, apiErrorPayload, apiErrors } from "@/lib/api-response";

// Input validation schema
const analyticsSchema = z.object({
  linkId: z.string().min(1),
  slug: z.string().min(1),
  domain: z.string().optional(),
  workspaceId: z.string().min(1),
  analyticsData: z.object({
    ipAddress: z.string().ip().optional(),
    country: z.string().max(100),
    city: z.string().max(100),
    continent: z.string().max(50),
    browser: z.string().max(50),
    os: z.string().max(50),
    device: z.string().max(50),
    trigger: z.string().max(50),
    referer: z.string().max(200),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = analyticsSchema.safeParse(body);

    if (!validationResult.success) {
      console.error(
        "Analytics validation failed:",
        validationResult.error.flatten(),
      );
      return jsonWithETag(
        req,
        apiErrorPayload(
          "Invalid input data",
          "VALIDATION_ERROR",
          validationResult.error.flatten(),
        ),
        { status: 400 },
      );
    }

    const { linkId, slug, domain, workspaceId, analyticsData } = validationResult.data;

    // Verify the link exists and belongs to the workspace
    const link = await db.link.findFirst({
      where: {
        id: linkId,
        workspaceId,
        slug,
        domain: domain || "slugy.co",
      },
      select: { id: true, workspaceId: true },
    });

    if (!link) {
      return apiErrors.notFound("Link not found or access denied");
    }

    const usageRecord = await db.usage.findFirst({
      where: { workspaceId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (!usageRecord) {
      return apiErrors.notFound("Usage record not found for workspaceId: " + workspaceId);
    }

    await db.$transaction(
      async (tx) => {
        // Batch operations for better performance
        const [linkUpdate, usageUpdate] = await Promise.allSettled([
          tx.link.update({
            where: { id: linkId },
            data: {
              clicks: { increment: 1 },
              lastClicked: new Date(),
            },
          }),
          tx.usage.update({
            where: { id: usageRecord.id },
            data: {
              clicksTracked: { increment: 1 },
            },
          }),
        ]);

        if (linkUpdate.status === "rejected") {
          throw new Error(`Failed to update link: ${linkUpdate.reason}`);
        }
        if (usageUpdate.status === "rejected") {
          throw new Error(`Failed to update usage: ${usageUpdate.reason}`);
        }

        // Create analytics record
        const analyticsRecord = await tx.analytics.create({
          data: {
            linkId,
            clickedAt: new Date(),
            ipAddress: analyticsData.ipAddress?.substring(0, 45),
            country: analyticsData.country?.substring(0, 100),
            city: analyticsData.city?.substring(0, 100),
            continent: analyticsData.continent?.substring(0, 50),
            browser: analyticsData.browser,
            os: analyticsData.os,
            device: analyticsData.device,
            trigger: analyticsData.trigger,
            referer: analyticsData.referer?.substring(0, 500) || "Direct",
          },
        });

        return {
          linkUpdate: linkUpdate.value,
          usageUpdate: usageUpdate.value,
          analyticsRecord,
        };
      },
      {
        timeout: 5000,
        maxWait: 2000,
      },
    );

    const response = jsonWithETag(
      req,
      apiSuccessPayload(null, "Analytics tracked successfully"),
      { headers: { "Cache-Control": "no-store" } }
    );
    return response;
  } catch (error) {
    console.error("Analytics tracking error:", error);

    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      route: "analytics/track",
      method: "POST",
    };

    console.error("Analytics error details:", errorDetails);

    return jsonWithETag(req, apiErrorPayload("Failed to track analytics", "INTERNAL_ERROR", errorDetails), { status: 500 });
  }
}
