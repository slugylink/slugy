import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { password, domain } = await request.json();
    const context = await params;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    // Find the link with the given slug and domain
    const link = await db.link.findFirst({
      where: {
        slug: context.slug,
        domain: domain || "slugy.co",
        isArchived: false,
      },
      select: {
        id: true,
        url: true,
        password: true,
        expiresAt: true,
        expirationUrl: true,
        domain: true,
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Check if link has expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          error: "Link has expired",
          redirectUrl: link.expirationUrl || null,
        },
        { status: 410 },
      );
    }

    // Check if link is password protected
    if (!link.password) {
      return NextResponse.json(
        { error: "Link is not password protected" },
        { status: 400 },
      );
    }

    // Verify password
    if (link.password !== password) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Set a cookie to remember password verification and return the response
    const response = NextResponse.json({
      success: true,
      url: link.url,
    });
    
    // Create domain-specific cookie name
    const cookieName = `password_verified_${link.domain}_${context.slug}`;
    response.cookies.set(cookieName, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 15, // 15 minutes
    });
    return response;
  } catch (error) {
    console.error("Password verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}