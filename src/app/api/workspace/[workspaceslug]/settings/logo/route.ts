import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { s3Service } from "@/lib/s3-service";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import {
  invalidateWorkspaceCache,
  invalidateWorkspaceBySlug,
} from "@/lib/cache-utils/workspace-cache";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;

    if (!context.workspaceslug) {
      return NextResponse.json(
        { message: "Workspace slug is required" },
        { status: 400 },
      );
    }

    const workspace = await db.workspace.findFirst({
      where: {
        userId: session.user.id,
        slug: context.workspaceslug,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { message: "Workspace not found" },
        { status: 404 },
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

    // Delete old logo from S3 if it exists
    if (workspace.logo) {
      try {
        // Extract the file key from the S3 URL
        const url = new URL(workspace.logo);
        const oldLogoKey = url.pathname.substring(1); // Remove leading slash
        if (oldLogoKey) {
          await s3Service.deleteFile(oldLogoKey);
        }
      } catch (error) {
        console.error("Error deleting old logo from S3:", error);
        // Continue with upload even if deletion fails
      }
    }

    // Generate a unique file key for the logo
    const fileKey = `workspace-logos/${workspace.id}/${Date.now()}-${file.name}`;

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
    const logoUrl = `https://files.slugy.co/${fileKey}`;

    // Update workspace with new logo URL
    const updatedWorkspace = await db.workspace.update({
      where: { id: workspace.id },
      data: { logo: logoUrl },
    });

    // Invalidate caches
    await Promise.all([
      revalidateTag("workspace", 'max'),
      revalidateTag("all-workspaces", 'max'),
      invalidateWorkspaceCache(session.user.id),
      invalidateWorkspaceBySlug(session.user.id, context.workspaceslug),
    ]);

    return NextResponse.json(updatedWorkspace);
  } catch (error) {
    console.error("Error uploading workspace logo:", error);
    return NextResponse.json(
      { message: "Failed to upload workspace logo" },
      { status: 500 },
    );
  }
}
