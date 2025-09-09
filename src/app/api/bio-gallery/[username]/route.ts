import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

// Constants for better maintainability
const CACHE_DURATION = 300; // 5 minutes
const STALE_WHILE_REVALIDATE = 600; // 10 minutes
const MAX_USERNAME_LENGTH = 50;

// Input validation schema
const usernameSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(MAX_USERNAME_LENGTH)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

// Error response helper
function createErrorResponse(
  message: string,
  status: number,
  details?: string[],
) {
  return NextResponse.json(
    {
      error: message,
      status,
      details,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

// Success response helper with caching
function createSuccessResponse(data: unknown, cacheControl?: string) {
  const response = NextResponse.json(data);

  // Set cache headers for better performance
  if (cacheControl) {
    response.headers.set("Cache-Control", cacheControl);
  } else {
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
    );
  }

  // Additional performance headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Bio-Gallery-Cache", "enabled");

  return response;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    // Parse and validate parameters
    const params = await context.params;
    const validationResult = usernameSchema.safeParse(params);

    if (!validationResult.success) {
      return createErrorResponse(
        "Invalid username format",
        400,
        validationResult.error.errors.map((e) => e.message),
      );
    }

    const { username } = validationResult.data;

    // Get session with better error handling
    let session;
    try {
      session = await auth.api.getSession({
        headers: await headers(),
      });
    } catch (authError) {
      console.error("Authentication error:", authError);
      return createErrorResponse("Authentication service unavailable", 503);
    }

    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized access", 401);
    }

    // Optimized database query with better error handling
    let bio;
    try {
      bio = await db.bio.findUnique({
        where: {
          userId: session.user.id,
          username: username,
        },
        include: {
          socials: {
            orderBy: { platform: "asc" },
          },
          links: {
            orderBy: { position: "asc" },
          },
        },
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return createErrorResponse("Database service unavailable", 503);
    }

    if (!bio) {
      return createErrorResponse("Bio gallery not found", 404);
    }

    // Optimized data transformation
    const safeGallery = {
      username: bio.username,
      name: bio.name,
      bio: bio.bio,
      logo: bio.logo,
      theme: bio.theme ?? "default",
      socials: bio.socials
        .filter((s) => s.platform && s.platform.trim()) // Remove empty/null platforms
        .map((s) => ({
          platform: s.platform!.trim(),
          url: s.url?.trim() ?? "",
          isPublic: Boolean(s.isPublic),
        })),
      links: bio.links.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        isPublic: Boolean(link.isPublic),
        position: link.position,
        clicks: link.clicks,
        galleryId: link.bioId, // Use bioId from the schema
      })),
    };

    // For admin dashboard, use no-cache to ensure fresh data after updates
    const cacheControl = `private, no-cache, no-store, must-revalidate`;

    return createSuccessResponse(safeGallery, cacheControl);
  } catch (error) {
    console.error("Unexpected error in bio gallery route:", error);

    // Don't expose internal errors to client
    return createErrorResponse("Internal server error", 500);
  }
}
