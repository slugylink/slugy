import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { z } from "zod";
import { setWorkspaceLimitsCache } from "@/lib/cache-utils/workspace-cache";

// Input validation schema
const usagesSchema = z.object({
  linkId: z.string().min(1),
  slug: z.string().min(1),
  domain: z.string().optional(),
  workspaceId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = usagesSchema.safeParse(body);

    if (!validationResult.success) {
      console.error(
        "Analytics validation failed:",
        validationResult.error.flatten(),
      );
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { linkId, slug, domain, workspaceId } = validationResult.data;

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
      return NextResponse.json(
        { error: "Link not found or access denied" },
        { status: 404 },
      );
    }

    const [usageRecord, workspace] = await Promise.all([
      db.usage.findFirst({
        where: { workspaceId },
        select: { id: true, clicksTracked: true },
        orderBy: { createdAt: "desc" },
      }),
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: { maxClicksLimit: true },
      }),
    ]);

    if (!usageRecord) {
      return NextResponse.json(
        { error: "Usage record not found for workspaceId: " + workspaceId },
        { status: 404 },
      );
    }

    // Enforce monthly click limit per workspace (from subscription plan)
    if (
      workspace?.maxClicksLimit != null &&
      usageRecord.clicksTracked >= workspace.maxClicksLimit
    ) {
      return NextResponse.json(
        {
          error: "Click limit reached for this workspace",
          code: "CLICK_LIMIT_REACHED",
        },
        { status: 429 },
      );
    }

    const updatedUsage = await db.$transaction(
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
            select: { clicksTracked: true },
          }),
        ]);

        if (linkUpdate.status === "rejected") {
          throw new Error(`Failed to update link: ${linkUpdate.reason}`);
        }
        if (usageUpdate.status === "rejected") {
          throw new Error(`Failed to update usage: ${usageUpdate.reason}`);
        }

        return {
          linkUpdate: linkUpdate.value,
          usageUpdate: usageUpdate.value,
        };
      },
      {
        timeout: 5000,
        maxWait: 2000,
      },
    );

    // Update cache with fresh clicksTracked value for fast subsequent checks
    if (workspace?.maxClicksLimit != null && updatedUsage.usageUpdate.clicksTracked != null) {
      void setWorkspaceLimitsCache(workspaceId, {
        maxClicksLimit: workspace.maxClicksLimit,
        clicksTracked: updatedUsage.usageUpdate.clicksTracked,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Analytics tracked successfully",
    });

    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Analytics tracking error:", error);

    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      route: "analytics/usages",
      method: "POST",
    };

    console.error("Analytics error details:", errorDetails);

    return NextResponse.json(
      { error: "Failed to track analytics" },
      { status: 500 },
    );
  }
}
