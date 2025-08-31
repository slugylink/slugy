import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";

const socialSchema = z.object({
  platform: z.string(),
  url: z.string().optional(),
  isPublic: z.boolean().optional(),
});

const bodySchema = z.object({
  socials: z.array(socialSchema),
});

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

    if (!session.user) {
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
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    
    // Upsert each social
    const results = await Promise.all(
      parsed.data.socials.map(async (social) => {
        // Try to find existing social for this gallery and platform
        const existing = await db.bioSocials.findFirst({
          where: {
            bioId: gallery.id,
            platform: social.platform,
          },
        });
        if (existing) {
          return db.bioSocials.update({
            where: { id: existing.id },
            data: {
              url: social.url,
              isPublic: social.isPublic ?? false,
            },
          });
        } else {
          return db.bioSocials.create({
            data: {
              bioId: gallery.id,
              platform: social.platform,
              url: social.url,
              isPublic: social.isPublic ?? false,
            },
          });
        }
      }),
    );

    // Invalidate both caches: public gallery + admin dashboard
    await Promise.all([
      invalidateBioCache.socials(params.username),           // Public cache
      invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
    ]);

    return NextResponse.json({ message: "Socials updated", socials: results });
  } catch (error) {
    console.error("Error updating socials:", error);
    return NextResponse.json(
      { message: "Error updating socials" },
      { status: 500 },
    );
  }
}
