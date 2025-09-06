import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { z } from "zod";

// Input validation schema
const usagesSchema = z.object({
  linkId: z.string().min(1),
  slug: z.string().min(1),
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

    const { slug, workspaceId } = validationResult.data;

    const usageRecord = await db.usage.findFirst({
      where: { workspaceId },
      select: { id: true },
      orderBy: { createdAt: "desc" }, // Get the latest usage record
    });

    if (!usageRecord) {
      return NextResponse.json(
        { error: "Usage record not found for workspaceId: " + workspaceId },
        { status: 404 },
      );
    }

    await db.$transaction(
      async (tx) => {
        // Batch operations for better performance
        const [linkUpdate, usageUpdate] = await Promise.allSettled([
          tx.link.update({
            where: { slug },
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

        return {
          linkUpdate: linkUpdate.value,
          usageUpdate: usageUpdate.value,
        };
      },
      {
        timeout: 5000, // 5 second timeout
        maxWait: 2000, // Max wait for connection
      },
    ); // Set response caching headers

    const response = NextResponse.json({
      success: true,
      message: "Analytics tracked successfully",
    });

    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Analytics tracking error:", error); // Structured error logging for monitoring

    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      route: "analytics/track",
      method: "POST",
    };

    console.error("Analytics error details:", errorDetails);

    return NextResponse.json(
      { error: "Failed to track analytics" },
      { status: 500 },
    );
  }
}
