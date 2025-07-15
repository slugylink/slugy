import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(
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

    const { username } = params;

    const bio = await db.bio.findUnique({
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

    if (!bio) {
      return NextResponse.json(
        { error: "Bio gallery not found" },
        { status: 404 },
      );
    }

    const safeGallery = {
      ...bio,
      socials: bio.socials
        .filter((s) => s.platform) // remove null platforms
        .map((s) => ({
          platform: s.platform ?? "",
          url: s.url ?? "",
          isPublic: s.isPublic,
        })),
      theme: bio.theme ?? undefined,
    };

    return NextResponse.json(safeGallery);
  } catch (error) {
    console.error("Error fetching bio gallery:", error);
    return NextResponse.json(
      { error: "Failed to fetch bio gallery" },
      { status: 500 },
    );
  }
}
