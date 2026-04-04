import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { jsonWithETag } from "@/lib/http";
import { headers } from "next/headers";
import { z } from "zod";
import { getWorkspaceAccess, hasRole } from "@/lib/workspace-access";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";
import { updateLink } from "@/lib/tinybird/slugy-links-metadata";
import { waitUntil } from "@vercel/functions";

const DEFAULT_DOMAIN = "slugy.co";
const MAX_TAGS_PER_WORKSPACE = 5;

const updateLinkSchema = z.object({
  url: z.string().url().optional(),
  slug: z.string().max(50).optional(),
  description: z.string().max(500).optional().nullable(),
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
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Preprocess: convert empty strings to null for optional fields
    const preprocessedBody = {
      ...body,
      description: body.description === "" ? null : body.description,
      image: body.image === "" ? null : body.image,
      title: body.title === "" ? null : body.title,
      metadesc: body.metadesc === "" ? null : body.metadesc,
      password: body.password === "" ? null : body.password,
      expiresAt: body.expiresAt === "" ? null : body.expiresAt,
      expirationUrl: body.expirationUrl === "" ? null : body.expirationUrl,
    };
    const validatedData = updateLinkSchema.parse(preprocessedBody);

    const context = await params;

    // Check workspace access (member/admin/owner can edit links)
    const access = await getWorkspaceAccess(
      session.user.id,
      context.workspaceslug,
    );
    if (!access.success || !access.workspace || !hasRole(access.role, "member"))
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    const workspace = access.workspace;

    const link = await db.link.findFirst({
      where: { id: context.linkId, workspaceId: workspace.id },
      select: {
        id: true,
        slug: true,
        domain: true,
        image: true,
      },
    });
    if (!link) {
      return jsonWithETag(req, { error: "Link not found" }, { status: 404 });
    }

    // If customDomainId is being updated, verify it belongs to the workspace and get the domain name
    let customDomainName: string | null = null;
    if (validatedData.customDomainId !== undefined) {
      if (validatedData.customDomainId) {
        const customDomain = await db.customDomain.findFirst({
          where: {
            id: validatedData.customDomainId,
            workspaceId: workspace.id,
            verified: true,
            dnsConfigured: true,
          },
          select: { domain: true },
        });

        if (!customDomain) {
          return jsonWithETag(
            req,
            { error: "Invalid or unverified custom domain" },
            { status: 400 },
          );
        }

        customDomainName = customDomain.domain;
      }
      // If customDomainId is null, we're removing the custom domain (reverting to default)
    }

    // If slug and/or domain is changing, check uniqueness for the target pair.
    const targetSlug = validatedData.slug?.trim() || link.slug;
    const targetDomain =
      validatedData.customDomainId !== undefined
        ? customDomainName || DEFAULT_DOMAIN
        : link.domain || DEFAULT_DOMAIN;

    if (
      targetSlug !== link.slug ||
      targetDomain !== (link.domain || DEFAULT_DOMAIN)
    ) {
      const existingSlug = await db.link.findFirst({
        where: {
          slug: targetSlug,
          domain: targetDomain,
          id: { not: link.id }, // Exclude current link from check
        },
        select: { id: true },
      });

      if (existingSlug) {
        return jsonWithETag(
          req,
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
        return jsonWithETag(
          req,
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
      // Only delete old R2 image if it's being replaced with a different URL
      if (
        link.image &&
        link.image !== validatedData.image &&
        link.image.includes("files.slugy.co")
      ) {
        try {
          const { s3Service } = await import("@/lib/s3-service");
          const url = new URL(link.image);
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
      const linkWithTags = await db.$transaction(async (tx) => {
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
          updateData.domain = customDomainName || DEFAULT_DOMAIN;
        }

        // Update the link
        await tx.link.update({
          where: { id: context.linkId },
          data: updateData,
        });

        // Handle tags if provided
        if (validatedData.tags !== undefined) {
          // Remove all existing tag relationships
          await tx.linkTag.deleteMany({
            where: { linkId: context.linkId },
          });

          // Add new tag relationships if tags are provided
          if (validatedData.tags.length > 0) {
            const normalizedTags = Array.from(
              new Set(
                validatedData.tags.map((tag) => tag.trim()).filter(Boolean),
              ),
            );

            // Get existing tags for this workspace
            const existingTags = await tx.tag.findMany({
              where: {
                workspaceId: workspace.id,
                name: { in: normalizedTags },
                deletedAt: null,
              },
              select: { id: true, name: true, color: true },
            });

            // Find tags that don't exist yet
            const existingTagNames = new Set(
              existingTags.map((tag) => tag.name),
            );
            const newTagNames = normalizedTags.filter(
              (tagName) => !existingTagNames.has(tagName),
            );

            // Create new tags if needed
            let allTags = [...existingTags];
            if (newTagNames.length > 0) {
              // Check if we can create more tags (limit of 5 per workspace)
              const currentTagCount = await tx.tag.count({
                where: {
                  workspaceId: workspace.id,
                  deletedAt: null,
                },
              });

              const canCreateCount = Math.min(
                newTagNames.length,
                MAX_TAGS_PER_WORKSPACE - currentTagCount,
              );

              if (canCreateCount > 0) {
                const tagsToCreate = newTagNames.slice(0, canCreateCount);

                await tx.tag.createMany({
                  data: tagsToCreate.map((tagName) => ({
                    name: tagName,
                    workspaceId: workspace.id,
                    color: null,
                  })),
                  skipDuplicates: true,
                });

                allTags = await tx.tag.findMany({
                  where: {
                    workspaceId: workspace.id,
                    name: {
                      in: [
                        ...existingTags.map((tag) => tag.name),
                        ...tagsToCreate,
                      ],
                    },
                    deletedAt: null,
                  },
                  select: { id: true, name: true, color: true },
                });
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

        const updatedLink = await tx.link.findUnique({
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

        if (!updatedLink) {
          throw new Error("Link not found");
        }

        return updatedLink;
      });

      // Invalidate cache for the updated link
      await invalidateLinkCache(
        linkWithTags.slug!,
        linkWithTags.domain || DEFAULT_DOMAIN,
      );

      // Update link metadata in Tinybird
      waitUntil(
        updateLink({
          id: linkWithTags.id,
          domain: linkWithTags.domain || DEFAULT_DOMAIN,
          slug: linkWithTags.slug,
          url: linkWithTags.url,
          workspaceId: workspace.id,
          createdAt: linkWithTags.createdAt,
          tags: linkWithTags.tags.map((t) => ({ tagId: t.tag.id })),
        }),
      );

      return jsonWithETag(req, linkWithTags, { status: 200 });
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
        return jsonWithETag(
          req,
          { message: `Slug already exists for this domain!` },
          { status: 400 },
        );
      }
      // Re-throw other errors
      throw error;
    }
  } catch (error) {
    console.error("Error updating link:", error);
    if (error instanceof z.ZodError) {
      return jsonWithETag(
        req,
        { message: "Invalid input data", errors: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return jsonWithETag(
        req,
        { message: error.message },
        { status: error.message.includes("not found") ? 404 : 400 },
      );
    }
    return jsonWithETag(
      req,
      { message: "An error occurred while updating the link." },
      { status: 500 },
    );
  }
}
