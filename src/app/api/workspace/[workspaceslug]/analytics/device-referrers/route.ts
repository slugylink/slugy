import { getAnalytics } from "@/server/actions/analytics/get-analytics";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timePeriod = searchParams.get("time_period") as "24h" | "7d" | "30d" | "3m" | "12m" | "all" || "24h";
    const deviceType = searchParams.get("deviceType") as "devices" | "browsers" | "os";

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

    // device data
    type DeviceData =
      | { device: string; clicks: number }
      | { browser: string; clicks: number }
      | { os: string; clicks: number };
    let deviceData: DeviceData[] = [];
    switch (deviceType) {
      case "devices":
        deviceData = (analyticsData.devices ?? []).map((item: { device: string; clicks: number }) => ({
          device: item.device,
          clicks: item.clicks
        }));
        break;
      case "browsers":
        deviceData = (analyticsData.browsers ?? []).map((item: { browser: string; clicks: number }) => ({
          browser: item.browser,
          clicks: item.clicks
        }));
        break;
      case "os":
        deviceData = (analyticsData.oses ?? []).map((item: { os: string; clicks: number }) => ({
          os: item.os,
          clicks: item.clicks
        }));
        break;
      default:
        deviceData = [];
    }

    // referrer data
    interface ReferrerData {
      referrer: string;
      clicks: number;
    }
    const referrerData: ReferrerData[] = (analyticsData.referrers ?? []).map((item: ReferrerData) => ({
      referrer: item.referrer,
      clicks: item.clicks
    }));

    return NextResponse.json({ deviceData, referrerData });
  } catch (error) {
    console.error("[analytics/device-referrers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch device and referrer data" },
      { status: 500 }
    );
  }
} 