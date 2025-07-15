import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { s3Service } from "@/lib/s3-service";
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

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 },
      );
    }

    // Check file type
    if (!file.type.includes("image")) {
      return NextResponse.json(
        { message: "Please upload an image file" },
        { status: 400 },
      );
    }

    // Check file size (200KB)
    if (file.size > 200 * 1024) {
      return NextResponse.json(
        { message: "File size should be less than 200KB" },
        { status: 400 },
      );
    }

    // Generate a unique file key for the logo
    const fileKey = `bio-gallery-logo/${gallery.id}/${Date.now()}-${file.name}`;

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await s3Service.uploadFile(fileKey, buffer, file.type);
    } catch (error) {
      console.error("Error uploading to S3:", error);
      return NextResponse.json(
        { message: "Failed to upload file to storage" },
        { status: 500 },
      );
    }

    // Generate the public URL for the logo
    const logoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    // Update gallery with new logo URL
    const updatedGallery = await db.bio.update({
      where: { id: gallery.id },
      data: { logo: logoUrl },
    });

    return NextResponse.json(updatedGallery);
  } catch (error) {
    console.error("Error uploading gallery logo:", error);
    return NextResponse.json(
      { message: "Failed to upload gallery logo" },
      { status: 500 },
    );
  }
}
