import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";

// Updated schema to allow empty strings
const updateGallerySchema = z.object({
  name: z.string().optional(),
  bio: z.string().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  const params = await context.params;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gallery = await db.bio.findFirst({
      where: {
        userId: session.user.id,
        username: params.username,
      },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = (await req.json()) as unknown;

    const parseResult = updateGallerySchema.safeParse(body);
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.errors);
      return NextResponse.json(
        { error: "Invalid input", errors: parseResult.error.errors },
        { status: 400 },
      );
    }

    // Create an update object with only the fields that were provided
    const updateData: { name?: string; bio?: string } = {};

    // Only include fields that are explicitly provided (not undefined)
    if (parseResult.data.name !== undefined) {
      updateData.name = parseResult.data.name;
    }

    if (parseResult.data.bio !== undefined) {
      updateData.bio = parseResult.data.bio;
    }

    // If no fields were provided, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    // Update the gallery with only the provided fields
    const updatedGallery = await db.bio.update({
      where: { id: gallery.id },
      data: updateData,
    });

    // Invalidate both caches: public gallery + admin dashboard
    await Promise.all([
      invalidateBioCache.profile(params.username),           // Public cache
      invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
    ]);

    return NextResponse.json(updatedGallery);
  } catch (error) {
    console.error("Error updating gallery:", error);
    return NextResponse.json(
      { error: "Failed to update gallery" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  const params = await context.params;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gallery = await db.bio.findFirst({
      where: {
        userId: session.user.id,
        username: params.username,
      },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    await db.bio.delete({
      where: {
        id: gallery.id,
      },
    });

    // Invalidate both caches: public gallery + admin dashboard
    await Promise.all([
      invalidateBioCache.delete(params.username),           // Public cache
      invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gallery:", error);
    return NextResponse.json(
      { error: "Failed to delete gallery" },
      { status: 500 },
    );
  }
}
