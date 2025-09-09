import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";
import { headers } from "next/headers";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  const params = await context.params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
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

    const body: unknown = await req.json();
    const parsed = z
      .object({
        theme: z.string(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await db.bio.update({
      where: {
        id: gallery.id,
      },
      data: {
        theme: parsed.data.theme,
      },
    });


    // Invalidate both caches: public gallery + admin dashboard
    await Promise.all([
      invalidateBioCache.theme(params.username),           // Public cache
      invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
    ]);


    // Fetch the updated gallery data to return to frontend for immediate cache update
    const updatedGallery = await db.bio.findUnique({
      where: {
        userId: session.user.id,
        username: params.username,
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

    if (!updatedGallery) {
      return NextResponse.json({ error: "Failed to fetch updated gallery" }, { status: 500 });
    }

    // Transform the data to match the frontend expectations
    const safeGallery = {
      username: updatedGallery.username,
      name: updatedGallery.name,
      bio: updatedGallery.bio,
      logo: updatedGallery.logo,
      theme: updatedGallery.theme ?? "default",
      socials: updatedGallery.socials
        .filter((s) => s.platform && s.platform.trim())
        .map((s) => ({
          platform: s.platform!.trim(),
          url: s.url?.trim() ?? "",
          isPublic: Boolean(s.isPublic),
        })),
      links: updatedGallery.links.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        isPublic: Boolean(link.isPublic),
        position: link.position,
        clicks: link.clicks,
        galleryId: link.bioId,
      })),
    };


    return NextResponse.json({
      message: "Theme updated",
      gallery: safeGallery
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
