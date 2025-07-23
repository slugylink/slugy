import { getAnalytics } from "@/server/actions/analytics/get-analytics";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timePeriod = searchParams.get("time_period") as "24h" | "7d" | "30d" | "3m" | "12m" | "all" || "24h";
    
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

    const referrerData = (analyticsData.referrers ?? []).map(item => ({
      referrer: item.referrer,
      clicks: item.clicks
    }));

    return NextResponse.json(referrerData);
  } catch (error) {
    console.error("[analytics/referrers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch referrer data" },
      { status: 500 }
    );
  }
} 