import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { apiSuccessPayload, apiErrorPayload } from "@/lib/api-response";
import {
  verifyLinkPassword,
  createPasswordVerifiedCookieValue,
  passwordCookieName,
  LINK_PASSWORD_COOKIE_MAX_AGE,
  hashLinkPassword,
} from "@/lib/link-password";
import {
  checkRedirectRateLimit,
  normalizeIp,
} from "@/lib/middleware/rate-limit";

function getClientIP(req: NextRequest): string {
  const hasCloudflare = Boolean(req.headers.get("cf-ray"));
  const forwarded = req.headers.get("x-forwarded-for");
  const hops = forwarded
    ?.split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  const ip =
    (hasCloudflare ? req.headers.get("cf-connecting-ip") : null) ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    hops?.[hops.length - 1] ||
    "unknown";

  return normalizeIp(ip);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    if (process.env.NODE_ENV !== "development") {
      const limit = await checkRedirectRateLimit(getClientIP(request));
      if (!limit.success) {
        return jsonWithETag(
          request,
          apiErrorPayload(
            "Too many attempts. Try again later.",
            "RATE_LIMIT_EXCEEDED",
          ),
          { status: 429 },
        );
      }
    }

    const { password, domain } = await request.json();
    const context = await params;

    if (!password || typeof password !== "string") {
      return jsonWithETag(
        request,
        apiErrorPayload("Password is required", "BAD_REQUEST"),
        { status: 400 },
      );
    }

    const link = await db.link.findFirst({
      where: {
        slug: context.slug,
        domain: domain || "slugy.co",
        isArchived: false,
        deletedAt: null,
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
      return jsonWithETag(
        request,
        apiErrorPayload("Link not found", "NOT_FOUND"),
        { status: 404 },
      );
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return jsonWithETag(
        request,
        apiErrorPayload("Link has expired", "BAD_REQUEST", {
          redirectUrl: link.expirationUrl || null,
        }),
        { status: 410 },
      );
    }

    if (!link.password) {
      return jsonWithETag(
        request,
        apiErrorPayload("Link is not password protected", "BAD_REQUEST"),
        { status: 400 },
      );
    }

    if (!verifyLinkPassword(password, link.password)) {
      return jsonWithETag(
        request,
        apiErrorPayload("Invalid password", "UNAUTHORIZED"),
        { status: 401 },
      );
    }

    // Lazily upgrade legacy plaintext passwords
    if (!link.password.startsWith("scrypt$")) {
      void db.link
        .update({
          where: { id: link.id },
          data: { password: hashLinkPassword(password) },
        })
        .catch((err) =>
          console.error("[LinkPassword] Failed to upgrade hash:", err),
        );
    }

    const cookieValue = createPasswordVerifiedCookieValue(
      link.domain,
      context.slug,
    );
    if (!cookieValue) {
      return jsonWithETag(
        request,
        apiErrorPayload(
          "Password cookie secret not configured",
          "INTERNAL_ERROR",
        ),
        { status: 500 },
      );
    }

    const response = jsonWithETag(
      request,
      apiSuccessPayload({ url: link.url }),
    );

    response.cookies.set(
      passwordCookieName(link.domain, context.slug),
      cookieValue,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: LINK_PASSWORD_COOKIE_MAX_AGE,
      },
    );
    return response;
  } catch (error) {
    console.error("Password verification error:", error);
    return jsonWithETag(
      request,
      apiErrorPayload("Internal server error", "INTERNAL_ERROR"),
      { status: 500 },
    );
  }
}
