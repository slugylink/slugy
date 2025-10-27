import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { s3Service } from "@/lib/s3-service";
import { headers } from "next/headers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; linkId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;

    // Find the link and verify ownership
    const link = await db.link.findUnique({
      where: { id: context.linkId },
      include: { workspace: true },
    });

    if (!link) {
      return NextResponse.json(
        { message: "Link not found" },
        { status: 404 },
      );
    }

    // Verify workspace access
    if (link.workspace.slug !== context.workspaceslug) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
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
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "Please upload an image file" },
        { status: 400 },
      );
    }

    // Check file size (max 512KB)
    const maxSize = 512 * 1024; // 512KB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "Image size must be less than 512KB" },
        { status: 400 },
      );
    }

    // Delete old image from R2 if it exists and it's not a URL
    if (link.image && link.image.includes("files.slugy.co")) {
      try {
        // Extract the file key from the URL
        const url = new URL(link.image);
        const oldImageKey = url.pathname.substring(1); // Remove leading slash
        if (oldImageKey) {
          await s3Service.deleteFile(oldImageKey);
        }
      } catch (error) {
        console.error("Error deleting old image from R2:", error);
        // Continue with upload even if deletion fails
      }
    }

    // Generate a unique file key for the link image
    const fileKey = `link-images/${link.id}/${Date.now()}-${file.name}`;

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await s3Service.uploadFile(fileKey, buffer, file.type);
    } catch (error) {
      console.error("Error uploading to R2:", error);
      return NextResponse.json(
        { message: "Failed to upload file to storage" },
        { status: 500 },
      );
    }

    // Generate the public URL for the image
    const imageUrl = `https://files.slugy.co/${fileKey}`;

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("Error uploading link image:", error);
    return NextResponse.json(
      { message: "Failed to upload link image" },
      { status: 500 },
    );
  }
}

