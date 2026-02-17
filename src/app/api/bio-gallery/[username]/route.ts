import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { jsonWithETag } from "@/lib/http";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_USERNAME_LENGTH = 50;

// ─── Validation ───────────────────────────────────────────────────────────────

const usernameSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(MAX_USERNAME_LENGTH)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

// ─── Response Helpers ─────────────────────────────────────────────────────────

function errorResponse(
  req: Request,
  message: string,
  status: number,
  details?: string[],
) {
  return jsonWithETag(
    req,
    { error: message, status, details, timestamp: new Date().toISOString() },
    { status },
  );
}

function successResponse(req: Request, data: unknown) {
  // Admin dashboard route — always return fresh data
  return jsonWithETag(req, data, {
    status: 200,
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    // Validate username
    const params = await context.params;
    const parsed = usernameSchema.safeParse(params);

    if (!parsed.success) {
      return errorResponse(
        req,
        "Invalid username format",
        400,
        parsed.error.errors.map((e) => e.message),
      );
    }

    const { username } = parsed.data;

    // Authenticate
    let session;
    try {
      session = await auth.api.getSession({ headers: await headers() });
    } catch (err) {
      console.error("[Gallery API] Auth error:", err);
      return errorResponse(req, "Authentication service unavailable", 503);
    }

    if (!session?.user?.id) {
      return errorResponse(req, "Unauthorized", 401);
    }

    // Fetch bio
    let bio;
    try {
      bio = await db.bio.findUnique({
        where: { userId: session.user.id, username },
        include: {
          socials: { orderBy: { platform: "asc" } },
          links: { orderBy: { position: "asc" } },
        },
      });
    } catch (err) {
      console.error("[Gallery API] DB error:", err);
      return errorResponse(req, "Database service unavailable", 503);
    }

    if (!bio) {
      return errorResponse(req, "Bio gallery not found", 404);
    }

    // Shape response
    const gallery = {
      username: bio.username,
      name: bio.name,
      bio: bio.bio,
      logo: bio.logo,
      theme: bio.theme ?? "default",
      socials: bio.socials
        .filter((s) => s.platform?.trim())
        .map((s) => ({
          platform: s.platform!.trim(),
          url: s.url?.trim() ?? "",
          isPublic: Boolean(s.isPublic),
        })),
      links: bio.links.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        style: link.style,
        icon: link.icon,
        image: link.image,
        isPublic: Boolean(link.isPublic),
        position: link.position,
        clicks: link.clicks,
        galleryId: link.bioId,
      })),
    };

    return successResponse(req, gallery);
  } catch (err) {
    console.error("[Gallery API] Unexpected error:", err);
    return errorResponse(req, "Internal server error", 500);
  }
}
