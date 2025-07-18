import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const getCachedLink = unstable_cache(
  async (slug: string) => {
    return await db.link.findUnique({
      where: {
        slug: slug,
        isArchived: false,
      },
      select: {
        id: true,
        url: true,
        expiresAt: true,
        expirationUrl: true,
        password: true,
        workspaceId: true,
      },
    });
  },
  ["link-by-slug"],
  {
    revalidate: 60 * 30, // 30 minutes
    tags: ["link"],
  },
);

// cookie parser
const parseCookies = (cookieHeader: string | null): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: shortCode } = await params;

    // Validate code format for early exit
    if (
      !shortCode ||
      shortCode.length > 50 ||
      !/^[a-zA-Z0-9_-]+$/.test(shortCode)
    ) {
      return NextResponse.json({
        success: false,
        url: `${req.nextUrl.origin}/`,
      });
    }

    const link = await getCachedLink(shortCode);

    if (!link) {
      return NextResponse.json({
        success: false,
        url: `${req.nextUrl.origin}/`,
      });
    }

    // expiration
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      const expirationUrl =
        link.expirationUrl || `${req.nextUrl.origin}/?status=expired`;
      return NextResponse.json({
        success: true,
        url: expirationUrl,
        expired: true,
      });
    }

    if (link.password) {
      const cookieHeader = req.headers.get("cookie");
      const cookies = parseCookies(cookieHeader);
      const passwordVerified = cookies[`password_verified_${shortCode}`];

      if (!passwordVerified) {
        return NextResponse.json({
          success: true,
          url: null,
          requiresPassword: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      url: link.url,
      linkId: link.id,
      workspaceId: link.workspaceId,
    });
  } catch (error) {
    console.error("Error getting link:", error);
    return NextResponse.json({
      success: false,
      url: `${req.nextUrl.origin}/`,
    });
  }
}
