import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse, userAgent } from "next/server";
import { sendEventsToTinybird, AnalyticsEvent } from "../tinybird/tintbird";
import { getLink } from "./get-link";

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
    const cookieHeader = req.headers.get("cookie");
    const origin = req.nextUrl.origin;
    const linkData = await getLink(shortCode, cookieHeader, origin);

    if (linkData.success && linkData.url && !linkData.requiresPassword) {
      if (linkData.linkId && linkData.workspaceId) {
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
  try {
    const ua = userAgent(req);

    const analytics: AnalyticsData = {
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      country:
        req.headers.get("x-vercel-ip-country")?.toLowerCase() ?? "unknown",
      city: req.headers.get("x-vercel-ip-city") ?? "Unknown",
      continent:
        req.headers.get("x-vercel-ip-continent")?.toLowerCase() ?? "unknown",
      device: ua.device?.type?.toLowerCase() ?? "desktop",
      browser: ua.browser?.name?.toLowerCase() ?? "chrome",
      os: ua.os?.name?.toLowerCase() ?? "windows",
      referer: req.headers.get("referer") ?? "Direct",
    };

    const tbEvent: AnalyticsEvent = {
      linkId,
      workspaceId,
      slug,
      url: req.nextUrl.href,
      ip: analytics.ipAddress,
      country: analytics.country ?? "unknown",
      city: analytics.city ?? "Unknown",
      continent: analytics.continent ?? "unknown",
      device: analytics.device,
      browser: analytics.browser,
      os: analytics.os,
      ua: req.headers.get("user-agent") ?? "unknown",
      referer: analytics.referer ?? "Direct",
    };

    waitUntil(
      Promise.allSettled([
        sendEventsToTinybird(tbEvent),
        fetch(`${req.nextUrl.origin}/api/analytics/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkId,
            slug,
            workspaceId,
            analyticsData: analytics,
          }),
        }),
      ]),
    );
  } catch (err) {
    console.error("[Analytics Error]", err);
  }
}
