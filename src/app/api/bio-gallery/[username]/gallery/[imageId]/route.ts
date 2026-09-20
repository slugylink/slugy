import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { s3Service } from "@/lib/s3-service";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";

export const runtime = "nodejs";

const patchSchema = z.object({
  isPublic: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

async function findOwnedGallery(username: string, userId: string) {
  return db.bio.findFirst({
    where: { userId, username },
    select: { id: true },
  });
}

// * update a gallery image (visibility / position)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ username: string; imageId: string }> },
) {
  const params = await context.params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gallery = await findOwnedGallery(params.username, session.user.id);

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const parsed = patchSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", errors: parsed.error.errors },
        { status: 400 },
      );
    }

    const existing = await db.bioGalleryImage.findFirst({
      where: { id: params.imageId, bioId: gallery.id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const image = await db.bioGalleryImage.update({
      where: { id: existing.id },
      data: parsed.data,
      select: { id: true, image: true, position: true, isPublic: true },
    });

    await Promise.all([
      invalidateBioCache.profile(params.username),
      invalidateBioByUsernameAndUser(params.username, session.user.id),
    ]);

    return NextResponse.json(image);
  } catch (error) {
    console.error("Error updating gallery image:", error);
    return NextResponse.json(
      { error: "Failed to update gallery image" },
      { status: 500 },
    );
  }
}

// * delete a gallery image
export async function DELETE(
  req: Request,
  context: { params: Promise<{ username: string; imageId: string }> },
) {
  const params = await context.params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gallery = await findOwnedGallery(params.username, session.user.id);

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const existing = await db.bioGalleryImage.findFirst({
      where: { id: params.imageId, bioId: gallery.id, deletedAt: null },
      select: { id: true, image: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await db.bioGalleryImage.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    if (existing.image) {
      try {
        const url = new URL(existing.image);
        const key = url.pathname.substring(1);
        if (key) await s3Service.deleteFile(key);
      } catch (error) {
        console.error("Error deleting gallery image from R2:", error);
      }
    }

    await Promise.all([
      invalidateBioCache.profile(params.username),
      invalidateBioByUsernameAndUser(params.username, session.user.id),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    return NextResponse.json(
      { error: "Failed to delete gallery image" },
      { status: 500 },
    );
  }
}
