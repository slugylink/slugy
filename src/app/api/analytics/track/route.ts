import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const { linkId, slug, workspaceId, analyticsData } = await req.json();

    if (!linkId || !slug || !analyticsData) {
      console.error("Analytics tracking: Missing required fields", {
        linkId,
        slug,
        analyticsData,
      });
      return NextResponse.json(
        { error: "Missing linkId, slug, or analyticsData" },
        { status: 400 },
      );
    }

    // Find the usage record by workspaceId
    const usageRecord = await db.usage.findFirst({
      where: { workspaceId },
      select: { id: true },
    });
    if (!usageRecord) {
      return NextResponse.json(
        { error: "Usage record not found for workspaceId: " + workspaceId },
        { status: 404 },
      );
    }

    await db.$transaction(async (tx) => {
      await Promise.all([
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
        tx.analytics.create({
          data: {
            linkId,
            clickedAt: new Date(),
            ipAddress: analyticsData.ipAddress,
            country: analyticsData.country,
            city: analyticsData.city,
            continent: analyticsData.continent,
            browser:
              analyticsData.browser?.name || analyticsData.browser || "chrome",
            os: analyticsData.os?.name || analyticsData.os || "windows",
            device:
              analyticsData.device?.type || analyticsData.device || "desktop",
            referer: analyticsData.referer || "Direct",
          },
        }),
      ]);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track analytics" },
      { status: 500 },
    );
  }
}
