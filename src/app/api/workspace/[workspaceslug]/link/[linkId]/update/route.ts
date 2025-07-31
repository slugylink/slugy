import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { validateworkspaceslug } from "@/server/actions/workspace/workspace";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";

const updateLinkSchema = z.object({
  url: z.string().url().optional(),
  slug: z.string().max(50).optional(),
  image: z.string().url().optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  password: z.string().min(3).max(50).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  expirationUrl: z.string().url().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
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
      description: body.description === "" ? null : body.description,
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

    // If slug is being updated, check for uniqueness
    if (validatedData.slug && validatedData.slug !== link.slug) {
      const existingSlug = await db.link.findUnique({
        where: { slug: validatedData.slug },
        select: { id: true },
      });
      if (existingSlug && existingSlug.id !== link.id) {
        return NextResponse.json(
          { message: "Slug already exists" },
          { status: 400 },
        );
      }
    }

    // Prevent recursive links: do not allow destination URL to be a slugy.co short link
    if (typeof validatedData.url === 'string') {
      const ownDomainPattern = /^https?:\/\/(www\.)?(slugy\.co)(:[0-9]+)?\/[a-zA-Z0-9_-]{1,50}$/;
      if (ownDomainPattern.test(validatedData.url)) {
        return NextResponse.json(
          { error: "Recursive links are not allowed. You cannot shorten a slugy.co link." },
          { status: 400 },
        );
      }
    }

    // Use transaction to ensure data consistency
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
          const existingTagNames = existingTags.map(tag => tag.name);
          const newTagNames = validatedData.tags.filter(
            tagName => !existingTagNames.includes(tagName)
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
              5 - currentTagCount
            );

            if (canCreateCount > 0) {
              const tagsToCreate = newTagNames.slice(0, canCreateCount);
              
              const createdTags = await Promise.all(
                tagsToCreate.map(tagName =>
                  tx.tag.create({
                    data: {
                      name: tagName,
                      workspaceId: workspace.workspace.id,
                      color: null, // Default color
                    },
                    select: { id: true, name: true },
                  })
                )
              );

              allTags = [...existingTags, ...createdTags];
            }
          }

          // Create link-tag relationships for all tags
          if (allTags.length > 0) {
            await tx.linkTag.createMany({
              data: allTags.map(tag => ({
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

    // Fetch the updated link with tags for the response
    const linkWithTags = await db.link.findUnique({
      where: { id: context.linkId },
      select: {
        id: true,
        url: true,
        slug: true,
        image: true,
        title: true,
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
    await invalidateLinkCache(linkWithTags.slug!);

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
