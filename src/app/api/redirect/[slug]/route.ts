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
import { checkRedirectRateLimit } from "@/lib/middleware/rate-limit";
import { getClientIp } from "@/lib/middleware/client-ip";

function getClientIP(req: NextRequest): string {
  return getClientIp(req.headers);
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

    const requestedDomain =
      typeof domain === "string" && domain.trim()
        ? domain.trim().toLowerCase()
        : "slugy.co";

    // Fast path: direct (slug, domain) uses @@unique([slug, domain]).
    // Fallback covers renamed/relinked rows via the customDomain relation.
    const linkSelect = {
      id: true,
      url: true,
      password: true,
      expiresAt: true,
      expirationUrl: true,
      domain: true,
    } as const;

    let link = await db.link
      .findUnique({
        where: {
          slug_domain: { slug: context.slug, domain: requestedDomain },
        },
        select: linkSelect,
      })
      .catch(() => null);

    // findUnique misses archived/deleted rows; re-check with filters, then
    // fall back to the relation join only when the direct hit misses.
    if (link) {
      const gated = await db.link.findFirst({
        where: {
          id: link.id,
          isArchived: false,
          deletedAt: null,
        },
        select: linkSelect,
      });
      link = gated;
    }

    if (!link) {
      link = await db.link.findFirst({
        where: {
          slug: context.slug,
          isArchived: false,
          deletedAt: null,
          customDomain: { domain: requestedDomain },
        },
        select: linkSelect,
      });
    }

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
