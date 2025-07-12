import { type NextRequest } from "next/server";
import { extractUserAgentData } from "./user-agent";
import { waitUntil } from "@vercel/functions";
import { unstable_cache } from "next/cache";

// Cache link data for 30 seconds to avoid repeated API calls
const getCachedLinkData = unstable_cache(
  async (shortCode: string, origin: string) => {
    try {
      const response = await fetch(`${origin}/api/link/${shortCode}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, url: `${origin}/` };
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching link data:", error);
      return { success: false, url: `${origin}/` };
    }
  },
  ["link-redirect-data"],
  {
    revalidate: 60 * 30, // Cache for 30 minutes
    tags: ["link-redirect"],
  }
);

export async function URLRedirects(shortCode: string, req: NextRequest) {
  try {
    // Get cached link data
    const linkData = await getCachedLinkData(shortCode, req.nextUrl.origin);

    if (!linkData.success) {
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

    // Track analytics in background
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
