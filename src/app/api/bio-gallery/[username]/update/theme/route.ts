import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";
import { headers } from "next/headers";

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

    return NextResponse.json({ message: "Theme updated" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
