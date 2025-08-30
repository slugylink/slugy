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

// Constants for better maintainability
const REDIRECT_STATUS = 302;
const UNKNOWN_VALUE = "unknown";
const DIRECT_REFERER = "Direct";

// Analytics tracking with better error handling and performance
async function trackAnalytics(
  req: NextRequest,
  linkId: string,
  slug: string,
  workspaceId: string,
): Promise<void> {
  try {
    const ua = userAgent(req);
    const headers = req.headers;

    const analytics: AnalyticsData = {
      ipAddress: headers.get("x-forwarded-for") ?? UNKNOWN_VALUE,
      country: headers.get("x-vercel-ip-country")?.toLowerCase() ?? UNKNOWN_VALUE,
      city: decodeURIComponent(headers.get("x-vercel-ip-city") ?? "Unknown"),
      continent: headers.get("x-vercel-ip-continent")?.toLowerCase() ?? UNKNOWN_VALUE,
      device: ua.device?.type?.toLowerCase() ?? "desktop",
      browser: ua.browser?.name?.toLowerCase() ?? "chrome",
      os: ua.os?.name?.toLowerCase() ?? "windows",
      referer: headers.get("referer") ?? DIRECT_REFERER,
    };

    const tbEvent: AnalyticsEvent = {
      linkId,
      workspaceId,
      slug,
      url: req.nextUrl.href,
      ip: analytics.ipAddress,
      country: analytics.country ?? UNKNOWN_VALUE,
      city: analytics.city ?? "Unknown",
      continent: analytics.continent ?? UNKNOWN_VALUE,
      device: analytics.device,
      browser: analytics.browser,
      os: analytics.os,
      ua: headers.get("user-agent") ?? UNKNOWN_VALUE,
      referer: analytics.referer ?? DIRECT_REFERER,
    };

    // Use waitUntil for non-blocking analytics
    waitUntil(
      Promise.allSettled([
        // Tinybird analytics
        sendEventsToTinybird(tbEvent).catch((err) => 
          console.error("[Tinybird Analytics Error]", err)
        ),
        
        // Internal analytics API
        fetch(`${req.nextUrl.origin}/api/analytics/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkId,
            slug,
            workspaceId,
            analyticsData: analytics,
          }),
        }).catch((err) => 
          console.error("[Internal Analytics Error]", err)
        ),
      ]),
    );
  } catch (err) {
    console.error("[Analytics Error]", err);
  }
}

// Main redirection function with better error handling
export async function URLRedirects(
  req: NextRequest,
  shortCode: string,
): Promise<NextResponse | null> {
  try {
    // Early validation
    if (!shortCode || shortCode.trim().length === 0) {
      console.warn("Empty shortCode provided to URLRedirects");
      return null;
    }

    const cookieHeader = req.headers.get("cookie");
    const origin = req.nextUrl.origin;
    
    // Get link data with error handling
    const linkData = await getLink(shortCode, cookieHeader, origin);

    // Handle different response scenarios
    if (!linkData.success) {
      console.warn(`Link lookup failed for slug "${shortCode}":`, linkData.error);
      return null;
    }

    // Handle password protection
    if (linkData.requiresPassword) {
      // Redirect to password page or show password form
      return null; // Let the main app handle password protection
    }

    // Handle expired links
    if (linkData.expired && linkData.url) {
      return NextResponse.redirect(new URL(linkData.url), REDIRECT_STATUS);
    }

    // Handle successful redirects
    if (linkData.url && linkData.linkId && linkData.workspaceId) {
      // Track analytics asynchronously
      void trackAnalytics(req, linkData.linkId, shortCode, linkData.workspaceId);
      
      // Perform redirect
      return NextResponse.redirect(new URL(linkData.url), REDIRECT_STATUS);
    }

    // Handle not found
    if (linkData.url && linkData.url.includes("status=not-found")) {
      return NextResponse.redirect(new URL(linkData.url), REDIRECT_STATUS);
    }

    return null;

  } catch (error) {
    console.error(`Link redirect error for slug "${shortCode}":`, error);
    return null;
  }
}
