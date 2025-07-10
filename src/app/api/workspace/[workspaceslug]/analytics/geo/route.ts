import { getAnalytics } from "@/server/actions/analytics/get-analytics";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timePeriod = searchParams.get("time_period") as "24h" | "7d" | "30d" | "3m" | "12m" | "all" || "24h";
    const type = searchParams.get("type") as "countries" | "cities" | "continents";
    
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

    let geoData;
    switch (type) {
      case "countries":
        geoData = analyticsData.countries.map(item => ({
          country: item.country,
          clicks: item.clicks
        }));
        break;
      case "cities":
        geoData = analyticsData.cities.map(item => ({
          city: item.city,
          country: item.country,
          clicks: item.clicks
        }));
        break;
      case "continents":
        geoData = analyticsData.continents.map(item => ({
          continent: item.continent,
          clicks: item.clicks
        }));
        break;
      default:
        throw new Error("Invalid geo type");
    }

    return NextResponse.json(geoData);
  } catch (error) {
    console.error("[analytics/geo] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch geo data" },
      { status: 500 }
    );
  }
} 