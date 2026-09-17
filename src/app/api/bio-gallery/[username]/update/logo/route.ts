import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { s3Service } from "@/lib/s3-service";
import { headers } from "next/headers";

import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";

import sharp from "sharp";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB upload limit
const TARGET_FILE_SIZE = 300 * 1024; // 300 KB

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

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please upload an image file" },
        { status: 400 },
      );
    }

    // Prevent extremely large uploads before processing
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size should be less than 5MB" },
        { status: 400 },
      );
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer());

    let uploadBuffer = originalBuffer;
    let uploadContentType = file.type;
    let uploadFileName = file.name;

    /*
     * If the image is larger than 300 KB,
     * resize/compress it before uploading to R2.
     */
    if (file.size > TARGET_FILE_SIZE) {
      try {
        let quality = 85;
        let width = 1200;

        let processedBuffer = await sharp(originalBuffer)
          .resize({
            width,
            height: width,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({
            quality,
          })
          .toBuffer();

        /*
         * First reduce WebP quality.
         */
        while (processedBuffer.length > TARGET_FILE_SIZE && quality > 30) {
          quality -= 10;

          processedBuffer = await sharp(originalBuffer)
            .resize({
              width,
              height: width,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({
              quality,
            })
            .toBuffer();
        }

        /*
         * If quality reduction isn't enough,
         * progressively reduce image dimensions.
         */
        while (processedBuffer.length > TARGET_FILE_SIZE && width > 400) {
          width -= 200;
          quality = Math.max(quality, 50);

          processedBuffer = await sharp(originalBuffer)
            .resize({
              width,
              height: width,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({
              quality,
            })
            .toBuffer();
        }

        /*
         * Final compression attempt.
         */
        if (processedBuffer.length > TARGET_FILE_SIZE) {
          processedBuffer = await sharp(originalBuffer)
            .resize({
              width: 400,
              height: 400,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({
              quality: 40,
            })
            .toBuffer();
        }

        uploadBuffer = processedBuffer;
        uploadContentType = "image/webp";
        uploadFileName = `${file.name.replace(/\.[^/.]+$/, "")}.webp`;
      } catch (error) {
        console.error("Error compressing image:", error);

        return NextResponse.json(
          { error: "Failed to process image" },
          { status: 500 },
        );
      }
    }

    // Delete old logo from R2 if it exists
    if (gallery.logo) {
      try {
        const url = new URL(gallery.logo);
        const oldLogoKey = url.pathname.substring(1);

        if (oldLogoKey) {
          await s3Service.deleteFile(oldLogoKey);
        }
      } catch (error) {
        console.error("Error deleting old logo from R2:", error);

        // Continue with upload even if deletion fails
      }
    }

    // Generate unique file key
    const fileKey = `bio-gallery-logo/${gallery.id}/${Date.now()}-${uploadFileName}`;

    // Upload processed image to R2
    try {
      await s3Service.uploadFile(fileKey, uploadBuffer, uploadContentType);
    } catch (error) {
      console.error("Error uploading to R2:", error);

      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 },
      );
    }

    // Generate public URL
    const logoUrl = `https://files.slugy.co/${fileKey}`;

    // Update gallery
    const updatedGallery = await db.bio.update({
      where: {
        id: gallery.id,
      },
      data: {
        logo: logoUrl,
      },
    });

    // Invalidate caches
    await Promise.all([
      invalidateBioCache.profile(params.username),
      invalidateBioByUsernameAndUser(params.username, session.user.id),
    ]);

    return NextResponse.json({
      ...updatedGallery,
      logo: logoUrl,
    });
  } catch (error) {
    console.error("Error uploading gallery logo:", error);

    return NextResponse.json(
      { error: "Failed to upload gallery logo" },
      { status: 500 },
    );
  }
}
