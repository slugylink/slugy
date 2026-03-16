import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";

export async function PUT(
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

    const body = (await req.json()) as unknown;
    // Add zod validation for the links array
    const LinksSchema = z.object({
      links: z.array(
        z.object({
          id: z.string(),
          position: z.number(),
        }),
      ),
    });
    const parseResult = LinksSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    const { links } = parseResult.data;

    const uniqueIds = new Set(links.map((link: { id: string }) => link.id));
    if (uniqueIds.size !== links.length) {
      return NextResponse.json(
        { error: "Duplicate link IDs are not allowed" },
        { status: 400 },
      );
    }

    if (links.length > 0) {
      const values = links.map(
        (link: { id: string; position: number }) =>
          Prisma.sql`(${link.id}, ${link.position})`,
      );

      const updatedCount = await db.$executeRaw(
        Prisma.sql`
          UPDATE "bio_links" AS bl
          SET
            "position" = v.position,
            "updatedAt" = NOW()
          FROM (VALUES ${Prisma.join(values)}) AS v(id, position)
          WHERE bl.id = v.id
            AND bl."bioId" = ${gallery.id}
        `,
      );

      if (updatedCount !== links.length) {
        return NextResponse.json(
          { error: "One or more links were not found in this gallery" },
          { status: 400 },
        );
      }
    }

    // Invalidate both caches: public gallery + admin dashboard
    await Promise.all([
      invalidateBioCache.links(params.username), // Public cache
      invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
