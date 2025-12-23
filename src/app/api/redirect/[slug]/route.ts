import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { apiSuccessPayload, apiErrorPayload } from "@/lib/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { password, domain } = await request.json();
    const context = await params;

    if (!password) {
      return jsonWithETag(
        request,
        apiErrorPayload("Password is required", "BAD_REQUEST"),
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
      return jsonWithETag(request, apiErrorPayload("Link not found", "NOT_FOUND"), { status: 404 });
    }

    // Check if link has expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return jsonWithETag(
        request,
        apiErrorPayload(
          "Link has expired",
          "BAD_REQUEST",
          { redirectUrl: link.expirationUrl || null },
        ),
        { status: 410 },
      );
    }

    // Check if link is password protected
    if (!link.password) {
      return jsonWithETag(
        request,
        apiErrorPayload("Link is not password protected", "BAD_REQUEST"),
        { status: 400 },
      );
    }

    // Verify password
    if (link.password !== password) {
      return jsonWithETag(request, apiErrorPayload("Invalid password", "UNAUTHORIZED"), { status: 401 });
    }

    // Set a cookie to remember password verification and return the response
    const response = jsonWithETag(request, apiSuccessPayload({ url: link.url }));
    
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
    return jsonWithETag(request, apiErrorPayload("Internal server error", "INTERNAL_ERROR"), { status: 500 });
  }
}