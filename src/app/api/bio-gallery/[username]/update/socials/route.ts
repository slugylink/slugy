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

    // De-duplicate by platform to avoid duplicate writes in a single request.
    // Last occurrence wins to match common PATCH semantics.
    const socialsByPlatform = new Map<
      string,
      { platform: string; url?: string; isPublic?: boolean }
    >();
    for (const social of parsed.data.socials) {
      socialsByPlatform.set(social.platform, social);
    }
    const socialsToUpsert = Array.from(socialsByPlatform.values());

    const platforms = socialsToUpsert.map((social) => social.platform);
    const existingSocials = await db.bioSocials.findMany({
      where: {
        bioId: gallery.id,
        platform: { in: platforms },
      },
      select: {
        id: true,
        platform: true,
      },
    });

    const existingByPlatform = new Map<string, string>();
    for (const social of existingSocials) {
      if (social.platform && !existingByPlatform.has(social.platform)) {
        existingByPlatform.set(social.platform, social.id);
      }
    }

    const results = await db.$transaction(async (tx) => {
      return Promise.all(
        socialsToUpsert.map((social) => {
          const existingId = existingByPlatform.get(social.platform);
          if (existingId) {
            return tx.bioSocials.update({
              where: { id: existingId },
              data: {
                url: social.url,
                isPublic: social.isPublic ?? false,
              },
            });
          }

          return tx.bioSocials.create({
            data: {
              bioId: gallery.id,
              platform: social.platform,
              url: social.url,
              isPublic: social.isPublic ?? false,
            },
          });
        }),
      );
    });

    // Invalidate both caches: public gallery + admin dashboard
    await Promise.all([
      invalidateBioCache.socials(params.username), // Public cache
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
