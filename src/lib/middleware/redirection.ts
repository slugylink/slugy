import { waitUntil } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { userAgent } from "next/server";
import { sendEventsToTinybird, AnalyticsEvent } from "../tinybird/tintbird";

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

    if (!linkResponse.ok) return null;

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

export function trackAnalytics(
  req: NextRequest,
  linkId: string,
  slug: string,
  workspaceId: string,
): void {
  try {
    const ua = userAgent(req);

    const analytics: AnalyticsData = {
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      country:
        req.headers.get("x-vercel-ip-country")?.toLowerCase() ?? "unknown",
      city: req.headers.get("x-vercel-ip-city")?.toLowerCase() ?? "unknown",
      continent:
        req.headers.get("x-vercel-ip-continent")?.toLowerCase() ?? "unknown",
      device: ua.device?.type?.toLowerCase() ?? "desktop",
      browser: ua.browser?.name?.toLowerCase() ?? "chrome",
      os: ua.os?.name?.toLowerCase() ?? "ios",
      referer: req.headers.get("referer") ?? "Direct",
    };

    const tbEvent: AnalyticsEvent = {
      linkId,
      workspaceId,
      slug,
      url: req.nextUrl.href,
      ip: analytics.ipAddress,
      country: analytics.country ?? "unknown",
      city: analytics.city ?? "unknown",
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
