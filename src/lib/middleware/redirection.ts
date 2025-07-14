import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { userAgent } from "next/server";

interface LinkData {
  success: boolean;
  url?: string;
  linkId?: string;
  requiresPassword?: boolean;
  expired?: boolean;
}

interface AnalyticsData {
  ipAddress: string;
  country?: string;
  city?: string;
  continent?: string;
  referer?: string;
  device: string;
  browser: string;
  os: string;
}

export async function URLRedirects(
  req: NextRequest,
  shortCode: string
): Promise<NextResponse | null> {
  try {
    // Fetch link data from API
    const linkResponse = await fetch(
      `${req.nextUrl.origin}/api/link/${shortCode}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.get("cookie") && {
            Cookie: req.headers.get("cookie")!,
          }),
        },
      }
    );

    if (!linkResponse.ok) {
      return null;
    }

    const linkData: LinkData = await linkResponse.json();

    if (linkData.success && linkData.url && !linkData.requiresPassword) {
      if (linkData.linkId) {
        void trackAnalytics(req, linkData.linkId, shortCode);
      }

      return NextResponse.redirect(new URL(linkData.url), 302);
    }

    return null;
  } catch (error) {
    console.error("Link redirect error:", error);
    return null;
  }
}

function trackAnalytics(
  req: NextRequest,
  linkId: string,
  slug: string
): void {
  const ua = userAgent(req);
  
  const analyticsData: AnalyticsData = {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "Unknown",
    country: req.headers.get("x-vercel-ip-country") ?? undefined,
    city: req.headers.get("x-vercel-ip-city") ?? undefined,
    continent: req.headers.get("x-vercel-ip-continent") ?? undefined,
    referer: req.headers.get("referer") ?? undefined,
    device: ua.device.type ?? "Desktop",
    browser: ua.browser.name ?? "unknown",
    os: ua.os.name ?? "unknown",
  };

  // Use waitUntil to ensure analytics tracking doesn't block the response
  waitUntil(
    fetch(`${req.nextUrl.origin}/api/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linkId,
        slug,
        analyticsData,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          console.error(
            "Analytics tracking failed:",
            response.status,
            response.statusText
          );
        }
      })
      .catch((error) => {
        console.error("Analytics tracking failed:", error);
      })
  );
}
