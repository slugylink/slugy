import { db } from "@/server/db";
import { type NextRequest } from "next/server";
import { extractUserAgentData } from "./user-agent";
import { waitUntil } from "@vercel/functions";
import { cookies } from "next/headers";

export async function URLRedirects(shortCode: string, req: NextRequest) {
  try {
    const link = await db.link.findUnique({
      where: {
        slug: shortCode,
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
      return `${req.nextUrl.origin}/`;
    }

    // Check expiration
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return link.expirationUrl || `${req.nextUrl.origin}/`;
    }

    // Check password protection
    if (link.password) {
      const cookieStore = await cookies();
      const passwordVerified = cookieStore.get(`password_verified_${shortCode}`);
      if (!passwordVerified) {
        return null;
      }
    }

    // Track analytics in background
    const analyticsData = extractUserAgentData(req);
    waitUntil(
      fetch(`${req.nextUrl.origin}/api/analytics/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: link.id,
          slug: shortCode,
          analyticsData,
        }),
      }).catch((error) => {
        console.error("Analytics tracking failed:", error);
      }),
    );

    return link.url;
  } catch (error) {
    console.error("Error getting link:", error);
    return null;
  }
}
