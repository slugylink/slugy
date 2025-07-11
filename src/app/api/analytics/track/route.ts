import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  try {
    const { linkId, slug, analyticsData } = await req.json();

    if (!linkId || !slug || !analyticsData) {
      return NextResponse.json(
        { error: "Missing linkId, slug, or analyticsData" },
        { status: 400 },
      );
    }

    console.log("📊 Analytics Tracking Data:", analyticsData);

    await db.$transaction(async (tx) => {
      await Promise.all([
        tx.link.update({
          where: { slug },
          data: {
            clicks: { increment: 1 },
            lastClicked: new Date(),
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
            browser: analyticsData.browser.name || "unknown",
            os: analyticsData.os.name || "unknown",
            device: analyticsData.device.type || "desktop",
            referer: analyticsData.referer || "direct",
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
