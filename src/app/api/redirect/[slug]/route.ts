import { db } from "@/server/db";
import { cookies } from "next/headers";
import { NextRequest, NextResponse, userAgent } from "next/server";
import { waitUntil } from "@vercel/functions";
import { headers } from "next/headers"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: shortCode } = await params;
    

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
      return NextResponse.json({ url: `${req.nextUrl.origin}/` });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({
        url: link.expirationUrl || `${req.nextUrl.origin}/`,
      });
    }

    if (link.password) {
      const cookieStore = await cookies();
      const passwordVerified = cookieStore.get(
        `password_verified_${shortCode}`,
      );
      if (!passwordVerified) {
        return NextResponse.json({ url: null });
      }
    }
    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error("Error getting link:", error);
    return NextResponse.json({ url: `${req.nextUrl.origin}/` });
  }
}
