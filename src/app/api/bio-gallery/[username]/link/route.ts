import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod"; // Import zod for input validation
import { checkBioGalleryLinkLimit } from "@/server/actions/limit";
import { headers } from "next/headers";

// Updated input validation schema
const createLinkSchema = z.object({
  title: z.string().max(100),
  url: z.string().url(),
});

// * add/create link to bio gallery [useranme]:
export async function POST(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  const params = await context.params;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as unknown;
    const parseResult = createLinkSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", errors: parseResult.error.errors },
        { status: 400 },
      );
    }

    const { title, url } = parseResult.data;

    const gallery = await db.bio.findFirst({
      where: {
        userId: session.user.id,
        username: params.username,
      },
      include: {
        _count: {
          select: {
            links: true,
          },
        },
      },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Bio gallery not found" }, { status: 404 });
    }

    // Check gallery link limit
    const limitResult = await checkBioGalleryLinkLimit(session.user.id, gallery.id);
    if (!limitResult.canCreate) {
      return NextResponse.json(
        {
          error: "You have reached the maximum number of links for this bio gallery",
          limitInfo: {
            currentLinks: limitResult.currentCount,
            maxLinks: limitResult.maxLimit,
            planType: limitResult.planType,
          },
        },
        { status: 403 },
      );
    }

    const newLink = await db.bioLinks.create({
      data: {
        title: title,
        url: url,
        bioId: gallery.id,
        position: 0,
      },
    });

    return NextResponse.json(newLink);
  } catch (error) {
    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// * get links from gallery [username]
export async function GET(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  const params = await context.params;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gallery = await db.bio.findUnique({
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

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const safeGallery = {
      ...gallery,
      socials: gallery.socials
        .filter((s) => s.platform) // remove null platforms
        .map((s) => ({
          platform: s.platform ?? "",
          url: s.url ?? "",
          isPublic: s.isPublic,
        })),
      theme: gallery.theme ?? undefined,
    };

    return NextResponse.json(safeGallery);
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery" },
      { status: 500 },
    );
  }
}
