import { getAnalytics } from "@/server/actions/analytics/get-analytics";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timePeriod = searchParams.get("time_period") as "24h" | "7d" | "30d" | "3m" | "12m" | "all" || "24h";
    const type = searchParams.get("type") as "devices" | "browsers" | "os";
    
    const context = await params;
    
    const analyticsData = await getAnalytics({
      workspaceslug: context.workspaceslug,
      timePeriod,
      slug_key: searchParams.get("slug_key"),
      country_key: searchParams.get("country_key"),
      city_key: searchParams.get("city_key"),
      continent_key: searchParams.get("continent_key"),
      browser_key: searchParams.get("browser_key"),
      os_key: searchParams.get("os_key"),
      referrer_key: searchParams.get("referrer_key"),
    });

    let deviceData;
    switch (type) {
      case "devices":
        deviceData = analyticsData.devices.map(item => ({
          device: item.device,
          clicks: item.clicks
        }));
        break;
      case "browsers":
        deviceData = analyticsData.browsers.map(item => ({
          browser: item.browser,
          clicks: item.clicks
        }));
        break;
      case "os":
        deviceData = analyticsData.oses.map(item => ({
          os: item.os,
          clicks: item.clicks
        }));
        break;
      default:
        throw new Error("Invalid device type");
    }

    return NextResponse.json(deviceData);
  } catch (error) {
    console.error("[analytics/device] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch device data" },
      { status: 500 }
    );
  }
} 