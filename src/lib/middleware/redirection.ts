import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { userAgent } from "next/server";

interface LinkData {
  success: boolean;
  url?: string;
  linkId?: string;
  requiresPassword?: boolean;
  expired?: boolean;
  workspaceId: string;
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
  shortCode: string,
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
      },
    );

    if (!linkResponse.ok) {
      return null;
    }

    const linkData: LinkData = await linkResponse.json();

    if (linkData.success && linkData.url && !linkData.requiresPassword) {
      if (linkData.linkId) {
        void trackAnalytics(
          req,
          linkData.linkId,
          shortCode,
          linkData.workspaceId,
        );
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
  slug: string,
  workspaceId: string,
): void {
  const ua = userAgent(req);

  const analyticsData: AnalyticsData = {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "Unknown",
    country: req.headers.get("x-vercel-ip-country")?.toLowerCase() ?? undefined,
    city: req.headers.get("x-vercel-ip-city")?.toLowerCase() ?? undefined,
    continent: req.headers.get("x-vercel-ip-continent")?.toLowerCase() ?? undefined,
    referer: req.headers.get("referer")?.toLowerCase() ?? undefined,
    device: ua.device.type ? ua.device.type.toLowerCase() : "desktop",
    browser: ua.browser.name ? ua.browser.name.toLowerCase() : "unknown",
    os: ua.os.name ? ua.os.name.toLowerCase() : "unknown",
  };

  waitUntil(
    fetch(`${req.nextUrl.origin}/api/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linkId,
        slug,
        workspaceId,
        analyticsData,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          console.error(
            "Analytics tracking failed:",
            response.status,
            response.statusText,
          );
        }
      })
      .catch((error) => {
        console.error("Analytics tracking failed:", error);
      }),
  );
}
