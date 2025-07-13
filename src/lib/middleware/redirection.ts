import { type NextRequest } from "next/server";
import { extractUserAgentData } from "./user-agent";
import { waitUntil } from "@vercel/functions";

export async function URLRedirects(shortCode: string, req: NextRequest) {
  try {
    // Validate short code format for early exit
    if (!shortCode || shortCode.length > 50 || !/^[a-zA-Z0-9_-]+$/.test(shortCode)) {
      return `${req.nextUrl.origin}/`;
    }

    // Get cookies from the original request
    const cookieHeader = req.headers.get("cookie");
    
    // Get link data from API
    const response = await fetch(`${req.nextUrl.origin}/api/link/${shortCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { "Cookie": cookieHeader }),
      },
    });

    if (!response.ok) {
      return `${req.nextUrl.origin}/`;
    }

    const linkData = await response.json();

    if (!linkData.success) { // Link not found
      return linkData.url || `${req.nextUrl.origin}/`;
    }

    // If link requires password but not verified, return null
    if (linkData.requiresPassword) {
      return null;
    }

    // If link is expired, return expiration URL
    if (linkData.expired) {
      return linkData.url;
    }

    // Track analytics in background for successful redirects
    const analyticsData = await extractUserAgentData(req);
    waitUntil(
      fetch(`${req.nextUrl.origin}/api/analytics/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: linkData.linkId,
          slug: shortCode,
          analyticsData,
        }),
      }).catch((error) => {
        console.error("Analytics tracking failed:", error);
      }),
    );

    return linkData.url;
  } catch (error) {
    console.error("Error getting link:", error);
    return null;
  }
}
