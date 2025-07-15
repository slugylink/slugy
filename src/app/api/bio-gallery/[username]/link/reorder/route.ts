import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

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

    // Update each link's position
    await Promise.all(
      links.map((link: { id: string; position: number }) =>
        db.bioLinks.update({
          where: { id: link.id },
          data: { position: link.position },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
