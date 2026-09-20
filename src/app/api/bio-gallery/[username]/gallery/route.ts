import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { s3Service } from "@/lib/s3-service";
import { processBioImage } from "@/lib/bio-image";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";
import { MAX_BIO_GALLERY_IMAGES } from "@/constants/bio-links";

export const runtime = "nodejs";

const MAX_IMAGES_PER_REQUEST = MAX_BIO_GALLERY_IMAGES;

async function findOwnedGallery(username: string, userId: string) {
  return db.bio.findFirst({
    where: { userId, username },
    select: { id: true },
  });
}

// * list gallery images for [username]
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

    const gallery = await findOwnedGallery(params.username, session.user.id);

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const images = await db.bioGalleryImage.findMany({
      where: { bioId: gallery.id, deletedAt: null },
      orderBy: { position: "asc" },
      select: { id: true, image: true, position: true, isPublic: true },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery images" },
      { status: 500 },
    );
  }
}

// * upload one or more images to gallery [username]
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

    const gallery = await findOwnedGallery(params.username, session.user.id);

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_IMAGES_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `You can upload up to ${MAX_IMAGES_PER_REQUEST} images at once`,
        },
        { status: 400 },
      );
    }

    const existingCount = await db.bioGalleryImage.count({
      where: { bioId: gallery.id, deletedAt: null },
    });

    if (existingCount >= MAX_BIO_GALLERY_IMAGES) {
      return NextResponse.json(
        { error: `You can have up to ${MAX_BIO_GALLERY_IMAGES} images` },
        { status: 400 },
      );
    }

    if (existingCount + files.length > MAX_BIO_GALLERY_IMAGES) {
      const remaining = MAX_BIO_GALLERY_IMAGES - existingCount;
      return NextResponse.json(
        {
          error: `You can add ${remaining} more image${
            remaining === 1 ? "" : "s"
          }`,
        },
        { status: 400 },
      );
    }

    const lastImage = await db.bioGalleryImage.findFirst({
      where: { bioId: gallery.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    let nextPosition = (lastImage?.position ?? -1) + 1;

    const createdImages: {
      id: string;
      image: string;
      position: number;
      isPublic: boolean;
    }[] = [];

    for (const file of files) {
      let processed;
      try {
        processed = await processBioImage(file);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid image" },
          { status: 400 },
        );
      }

      const fileKey = `bio-gallery-images/${gallery.id}/${Date.now()}-${nextPosition}-${processed.fileName}`;

      try {
        await s3Service.uploadFile(
          fileKey,
          processed.buffer,
          processed.contentType,
        );
      } catch (error) {
        console.error("Error uploading gallery image to R2:", error);
        return NextResponse.json(
          { error: "Failed to upload image to storage" },
          { status: 500 },
        );
      }

      const imageUrl = `https://files.slugy.co/${fileKey}`;

      const image = await db.bioGalleryImage.create({
        data: {
          bioId: gallery.id,
          image: imageUrl,
          position: nextPosition,
        },
        select: { id: true, image: true, position: true, isPublic: true },
      });

      createdImages.push(image);
      nextPosition += 1;
    }

    await Promise.all([
      invalidateBioCache.profile(params.username),
      invalidateBioByUsernameAndUser(params.username, session.user.id),
    ]);

    return NextResponse.json({ images: createdImages }, { status: 201 });
  } catch (error) {
    console.error("Error uploading gallery images:", error);
    return NextResponse.json(
      { error: "Failed to upload gallery images" },
      { status: 500 },
    );
  }
}
