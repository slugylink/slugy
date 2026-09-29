import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";

const visibilitySchema = z.object({
  isPublic: z.boolean(),
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
      select: { id: true },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const body = (await req.json()) as unknown;
    const parseResult = visibilitySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const updatedGallery = await db.bio.update({
      where: { id: gallery.id },
      data: { isPublic: parseResult.data.isPublic },
      select: { username: true, isPublic: true },
    });

    // Invalidate both caches: public gallery + admin dashboard
    await Promise.all([
      invalidateBioCache.profile(params.username), // Public cache
      invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
    ]);

    return NextResponse.json(updatedGallery);
  } catch (error) {
    console.error("Error updating gallery visibility:", error);
    return NextResponse.json(
      { error: "Failed to update gallery visibility" },
      { status: 500 },
    );
  }
}
