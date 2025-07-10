import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { waitUntil } from "@vercel/functions";

// Simplified user agent parsing
function parseUserAgent(uaHeader: string | null): {
  device: string;
  browser: string;
  os: string;
} {
  if (!uaHeader) {
    return { device: "desktop", browser: "chrome", os: "Unknown" };
  }

  const ua = uaHeader.toLowerCase();
  
  let device = "desktop";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    device = "mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    device = "tablet";
  }

  let browser = "chrome";
  if (ua.includes("firefox")) browser = "firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "safari";
  else if (ua.includes("edge")) browser = "edge";
  else if (ua.includes("opera")) browser = "opera";

  let os = "Unknown";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  return { device, browser, os };
}

// Simplified bot detection
function isBot(uaHeader: string | null): boolean {
  if (!uaHeader) return false;
  const ua = uaHeader.toLowerCase();
  return ua.includes("bot") || ua.includes("crawler") || ua.includes("spider");
}

// Extract analytics data
function extractAnalyticsData(req: NextRequest) {
  const uaHeader = req.headers.get("user-agent");
  const refererHeader = req.headers.get("referer");
  
  const vercelCountry = req.headers.get("x-vercel-ip-country");
  const vercelCity = req.headers.get("x-vercel-ip-city");
  const vercelRegion = req.headers.get("x-vercel-ip-country-region");
  const vercelContinent = req.headers.get("x-vercel-ip-continent");
  
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "Unknown";
  const isBotUser = isBot(uaHeader);
  
  const { device, browser, os } = parseUserAgent(uaHeader);
  
  return {
    ipAddress: ip,
    country: vercelCountry,
    city: vercelCity,
    region: vercelRegion,
    continent: vercelContinent,
    referer: refererHeader,
    device,
    browser,
    os,
    isBot: isBotUser,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const link = await db.link.findUnique({
      where: {
        slug,
        isArchived: false,
      },
      select: {
        id: true,
        url: true,
        expiresAt: true,
        expirationUrl: true,
        password: true,
      },
    });

    if (!link) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin), 302);
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.redirect(
        new URL(link.expirationUrl || "/", req.nextUrl.origin),
        302
      );
    }

    // Check for password protection
    if (link.password) {
      // For now, redirect to a password page or handle password verification
      // You can implement password verification logic here
      return NextResponse.redirect(new URL("/", req.nextUrl.origin), 302);
    }

    const analyticsData = extractAnalyticsData(req);

    // Process analytics in the background
    waitUntil(
      fetch(`${req.nextUrl.origin}/api/analytics/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkId: link.id,
          slug,
          analyticsData,
        }),
      }).catch((error) => {
        console.error("Analytics tracking failed:", error);
      }),
    );

    return NextResponse.redirect(new URL(link.url), 302);
  } catch (error) {
    console.error("Error getting link:", error);
    return NextResponse.redirect(new URL("/", req.nextUrl.origin), 302);
  }
}
