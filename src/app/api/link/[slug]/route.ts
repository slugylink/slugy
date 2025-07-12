import { db } from "@/server/db";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
// Cache link data for 30 seconds
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
      },
    });
  },
  ["link-by-slug"],
  {
    revalidate: 60 * 30, // Cache for 30 minutes    
    tags: ["link"],
  }
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: shortCode } = await params;

    // Use cached link lookup
    const link = await getCachedLink(shortCode);

    if (!link) {
      return NextResponse.json({ 
        success: false, 
        url: `${req.nextUrl.origin}/` 
      });
    }

    // Check expiration
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({
        success: true,
        url: link.expirationUrl || `${req.nextUrl.origin}/`,
        expired: true,
      });
    }

    // Check password protection
    if (link.password) {
      const cookieStore = await cookies();
      const passwordVerified = cookieStore.get(
        `password_verified_${shortCode}`,
      );
      console.log("passwordVerified", passwordVerified);
      if (link.password && !passwordVerified?.value) {
        return NextResponse.json({ 
          success: true, 
          url: null,
          requiresPassword: true 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      url: link.url,
      linkId: link.id 
    });
  } catch (error) {
    console.error("Error getting link:", error);
    return NextResponse.json({ 
      success: false, 
      url: `${req.nextUrl.origin}/` 
    });
  }
} 