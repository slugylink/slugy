import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { validateworkspaceslug } from "@/server/actions/workspace/workspace";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";
import { updateLink } from "@/lib/tinybird/slugy-links-metadata";
import { waitUntil } from "@vercel/functions";

const updateLinkSchema = z.object({
  url: z.string().url().optional(),
  slug: z.string().max(50).optional(),
  image: z.string().url().optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  metadesc: z.string().max(500).optional().nullable(),
  password: z.string().min(3).max(50).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  expirationUrl: z.string().url().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  customDomainId: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; linkId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Preprocess: convert empty strings to null for optional fields
    const preprocessedBody = {
      ...body,
      image: body.image === "" ? null : body.image,
      title: body.title === "" ? null : body.title,
      metadesc: body.metadesc === "" ? null : body.metadesc,
      password: body.password === "" ? null : body.password,
      expiresAt: body.expiresAt === "" ? null : body.expiresAt,
      expirationUrl: body.expirationUrl === "" ? null : body.expirationUrl,
    };
    const validatedData = updateLinkSchema.parse(preprocessedBody);

    const context = await params;

    // Validate workspace and link ownership
    const workspace = await validateworkspaceslug(
      session.user.id,
      context.workspaceslug,
    );
    if (!workspace.success || !workspace.workspace)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const link = await db.link.findUnique({
      where: { id: context.linkId, workspaceId: workspace.workspace.id },
    });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // If customDomainId is being updated, verify it belongs to the workspace and get the domain name
    let customDomainName: string | null = null;
    if (validatedData.customDomainId !== undefined) {
      if (validatedData.customDomainId) {
        const customDomain = await db.customDomain.findFirst({
          where: {
            id: validatedData.customDomainId,
            workspaceId: workspace.workspace.id,
            verified: true,
            dnsConfigured: true,
          },
          select: { domain: true },
        });

        if (!customDomain) {
          return NextResponse.json(
            { error: "Invalid or unverified custom domain" },
            { status: 400 },
          );
        }

        customDomainName = customDomain.domain;
      }
      // If customDomainId is null, we're removing the custom domain (reverting to default)
    }

    // If slug is being updated, check for uniqueness per domain
    if (validatedData.slug && validatedData.slug !== link.slug) {
      // Determine the target domain (current link's domain or new custom domain)
      const targetDomain = customDomainName || link.domain || "slugy.co";

      // Check if slug exists on the target domain (excluding current link)
      const existingSlug = await db.link.findFirst({
        where: {
          slug: validatedData.slug,
          domain: targetDomain,
          id: { not: link.id }, // Exclude current link from check
        },
        select: { id: true },
      });

      if (existingSlug) {
        return NextResponse.json(
          { message: `Slug already exists for this domain!` },
          { status: 400 },
        );
      }
    }

    // Prevent recursive links: do not allow destination URL to be a slugy.co short link
    if (typeof validatedData.url === "string") {
      const ownDomainPattern =
        /^https?:\/\/(www\.)?(slugy\.co)(:[0-9]+)?\/[a-zA-Z0-9_-]{1,50}$/;
      if (ownDomainPattern.test(validatedData.url)) {
        return NextResponse.json(
          {
            error:
              "Recursive links are not allowed. You cannot shorten a slugy.co link.",
          },
          { status: 400 },
        );
      }
    }

    // Check if image is being updated and delete old R2 image if exists
    // Only delete if the new image is different and it's a URL (not an uploaded file)
    // Note: If uploading via /upload-image endpoint, deletion happens there
    if (
      validatedData.image !== undefined &&
      validatedData.image !== null &&
      validatedData.image !== "" &&
      !validatedData.image.includes("files.slugy.co")
    ) {
      const currentLink = await db.link.findUnique({
        where: { id: context.linkId },
        select: { image: true },
      });

      // Only delete old R2 image if it's being replaced with a different URL
      if (
        currentLink?.image &&
        currentLink.image !== validatedData.image &&
        currentLink.image.includes("files.slugy.co")
      ) {
        try {
          const { s3Service } = await import("@/lib/s3-service");
          const url = new URL(currentLink.image);
          const oldImageKey = url.pathname.substring(1);
          if (oldImageKey) {
            await s3Service.deleteFile(oldImageKey);
          }
        } catch (error) {
          console.error("Error deleting old image from R2:", error);
        }
      }
    }

    // Use transaction to ensure data consistency
    try {
      await db.$transaction(async (tx) => {
        // Prepare update data (only provided fields)
        const updateData: Record<string, unknown> = {};
        for (const key of Object.keys(validatedData)) {
          const value = validatedData[key as keyof typeof validatedData];
          if (typeof value !== "undefined" && key !== "tags") {
            if (key === "expiresAt" && value && typeof value === "string") {
              updateData.expiresAt = new Date(value as string);
            } else if (key !== "tags") {
              updateData[key] = value;
            }
          }
        }

        // If customDomainId is being updated, also update the domain field
        if (validatedData.customDomainId !== undefined) {
          updateData.domain = customDomainName || "slugy.co";
        }

        // Update the link
        const link = await tx.link.update({
          where: { id: context.linkId },
          data: updateData,
          select: {
            id: true,
            url: true,
            slug: true,
            image: true,
            title: true,
            metadesc: true,
            description: true,
            password: true,
            expiresAt: true,
            expirationUrl: true,
            utm_source: true,
            utm_medium: true,
            utm_campaign: true,
            utm_content: true,
            utm_term: true,
            createdAt: true,
          },
        });

        // Handle tags if provided
        if (validatedData.tags !== undefined) {
          // Remove all existing tag relationships
          await tx.linkTag.deleteMany({
            where: { linkId: context.linkId },
          });

          // Add new tag relationships if tags are provided
          if (validatedData.tags.length > 0) {
            // Get existing tags for this workspace
            const existingTags = await tx.tag.findMany({
              where: {
                workspaceId: workspace.workspace.id,
                name: { in: validatedData.tags },
                deletedAt: null,
              },
              select: { id: true, name: true },
            });

            // Find tags that don't exist yet
            const existingTagNames = existingTags.map((tag) => tag.name);
            const newTagNames = validatedData.tags.filter(
              (tagName) => !existingTagNames.includes(tagName),
            );

            // Create new tags if needed
            let allTags = [...existingTags];
            if (newTagNames.length > 0) {
              // Check if we can create more tags (limit of 5 per workspace)
              const currentTagCount = await tx.tag.count({
                where: {
                  workspaceId: workspace.workspace.id,
                  deletedAt: null,
                },
              });

              const canCreateCount = Math.min(
                newTagNames.length,
                5 - currentTagCount,
              );

              if (canCreateCount > 0) {
                const tagsToCreate = newTagNames.slice(0, canCreateCount);

                const createdTags = await Promise.all(
                  tagsToCreate.map((tagName) =>
                    tx.tag.create({
                      data: {
                        name: tagName,
                        workspaceId: workspace.workspace.id,
                        color: null, // Default color
                      },
                      select: { id: true, name: true },
                    }),
                  ),
                );

                allTags = [...existingTags, ...createdTags];
              }
            }

            // Create link-tag relationships for all tags
            if (allTags.length > 0) {
              await tx.linkTag.createMany({
                data: allTags.map((tag) => ({
                  linkId: context.linkId,
                  tagId: tag.id,
                })),
                skipDuplicates: true,
              });
            }
          }
        }

        return link;
      });
    } catch (error: unknown) {
      // Handle unique constraint violation
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002" &&
        "meta" in error &&
        error.meta &&
        typeof error.meta === "object" &&
        "target" in error.meta &&
        Array.isArray(error.meta.target) &&
        error.meta.target.includes("slug")
      ) {
        return NextResponse.json(
          { message: `Slug already exists for this domain!` },
          { status: 400 },
        );
      }
      // Re-throw other errors
      throw error;
    }

    // Fetch the updated link with tags for the response
    const linkWithTags = await db.link.findUnique({
      where: { id: context.linkId },
      select: {
        id: true,
        url: true,
        slug: true,
        domain: true,
        image: true,
        title: true,
        metadesc: true,
        description: true,
        password: true,
        expiresAt: true,
        expirationUrl: true,
        utm_source: true,
        utm_medium: true,
        utm_campaign: true,
        utm_content: true,
        utm_term: true,
        createdAt: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    // Invalidate cache for the updated link
    if (!linkWithTags) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    await invalidateLinkCache(
      linkWithTags.slug!,
      linkWithTags.domain || "slugy.co",
    );

    // Update link metadata in Tinybird
    const linkData = {
      id: linkWithTags.id,
      domain: linkWithTags.domain || "slugy.co", // Use custom domain if set, otherwise default
      slug: linkWithTags.slug,
      url: linkWithTags.url,
      workspaceId: workspace.workspace.id,
      createdAt: linkWithTags.createdAt,
      tags: linkWithTags.tags.map((t) => ({ tagId: t.tag.id })),
    };

    waitUntil(updateLink(linkData));

    return NextResponse.json(linkWithTags, { status: 200 });
  } catch (error) {
    console.error("Error updating link:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: error.message.includes("not found") ? 404 : 400 },
      );
    }
    return NextResponse.json(
      { message: "An error occurred while updating the link." },
      { status: 500 },
    );
  }
}
