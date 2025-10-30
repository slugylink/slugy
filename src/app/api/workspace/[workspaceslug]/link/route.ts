import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { z } from "zod"; // Import zod for input validation
import { headers } from "next/headers";
import { checkWorkspaceAccessAndLimits } from "@/server/actions/limit";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";
import { waitUntil } from "@vercel/functions";
import { sendLinkMetadata } from "@/lib/tinybird/slugy-links-metadata";
const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  7,
);

// Updated input validation schema
const createLinkSchema = z.object({
  url: z.string().url(),
  slug: z
    .string()
    .max(50)
    .optional()
    .refine((val) => !val || val.length === 0 || val.length >= 3, {
      message: "Slug must be at least 3 characters if provided",
    }),
  image: z.string().url().optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  // Keep description (comments) and support metadesc for preview
  description: z.string().max(500).optional().nullable(),
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

type CreateLinkRequest = z.infer<typeof createLinkSchema>;

// Helper function to check slug availability for a specific domain
async function isSlugAvailable(slug: string, domain: string | null = null) {
  const existingSlug = await db.link.findFirst({
    where: {
      slug,
      domain: domain || "slugy.co", // Default to slugy.co if no domain specified
    },
    select: { id: true },
  });
  return !existingSlug;
}

// * Create a link
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CreateLinkRequest;
    // Preprocess: convert empty strings to null for optional fields
    const preprocessedBody = {
      ...body,
      image: body.image === "" ? null : body.image,
      title: body.title === "" ? null : body.title,
      description: body.description === "" ? null : body.description,
      metadesc: body.metadesc === "" ? null : body.metadesc,
      password: body.password === "" ? null : body.password,
      expiresAt: body.expiresAt === "" ? null : body.expiresAt,
      expirationUrl: body.expirationUrl === "" ? null : body.expirationUrl,
    };
    const validatedData = createLinkSchema.parse(preprocessedBody);

    const context = await params;

    const workspaceCheck = await checkWorkspaceAccessAndLimits(
      session.user.id,
      context.workspaceslug,
    );

    if (!workspaceCheck.success || !workspaceCheck.workspace)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!workspaceCheck.canCreateLinks) {
      return NextResponse.json(
        {
          error: "Link limit reached. Upgrade to Pro.",
          limitInfo: {
            currentLinks: workspaceCheck.currentLinks,
            maxLinks: workspaceCheck.maxLinks,
            planType: workspaceCheck.planType,
          },
        },
        { status: 403 },
      );
    }

    // Prevent recursive links: do not allow destination URL to be a slugy.co short link
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

    // If customDomainId is provided, verify it belongs to the workspace and get the domain name
    let customDomainName: string | null = null;
    if (validatedData.customDomainId) {
      const customDomain = await db.customDomain.findFirst({
        where: {
          id: validatedData.customDomainId,
          workspaceId: workspaceCheck.workspace.id,
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

    const shortUrlCode =
      validatedData.slug && validatedData.slug.trim() !== ""
        ? validatedData.slug
        : nanoid();

    if (!(await isSlugAvailable(shortUrlCode, customDomainName))) {
      return NextResponse.json(
        { message: `Slug already exists for this domain!` },
        { status: 400 },
      );
    }

    // Use transaction to ensure data consistency
    let result;
    try {
      result = await db.$transaction(async (tx) => {
        // Create link with optimized query
        const link = await tx.link.create({
          data: {
            workspaceId: workspaceCheck.workspace.id,
            userId: session.user.id,
            url: validatedData.url,
            slug: shortUrlCode,
            image: validatedData.image,
            title: validatedData.title,
            description: validatedData.description,
            metadesc: validatedData.metadesc ?? null,
            password: validatedData.password,
            ...(validatedData.expiresAt
              ? { expiresAt: new Date(validatedData.expiresAt) }
              : {}),
            expirationUrl: validatedData.expirationUrl,
            utm_source: validatedData.utm_source,
            utm_medium: validatedData.utm_medium,
            utm_campaign: validatedData.utm_campaign,
            utm_content: validatedData.utm_content,
            utm_term: validatedData.utm_term,
            customDomainId: validatedData.customDomainId || null,
            domain: customDomainName || "slugy.co", // Set the domain name for quick access
          },
          select: {
            id: true,
            url: true,
            slug: true,
            image: true,
            title: true,
            description: true,
            metadesc: true,
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
        if (validatedData.tags && validatedData.tags.length > 0) {
          // Get existing tags for this workspace
          const existingTags = await tx.tag.findMany({
            where: {
              workspaceId: workspaceCheck.workspace.id,
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
                workspaceId: workspaceCheck.workspace.id,
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
                      workspaceId: workspaceCheck.workspace.id,
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
                linkId: link.id,
                tagId: tag.id,
              })),
              skipDuplicates: true,
            });
          }
        }

        // Optimize updates by combining them
        await Promise.all([
          tx.workspace.update({
            where: { id: workspaceCheck.workspace.id },
            data: { linksUsage: { increment: 1 } },
          }),
          tx.usage.updateMany({
            where: {
              workspaceId: workspaceCheck.workspace.id,
              userId: session.user.id,
            },
            data: { linksCreated: { increment: 1 } },
          }),
        ]);

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

    // Fetch the created link with tags for the response
    const linkWithTags = await db.link.findUnique({
      where: { id: result.id },
      select: {
        id: true,
        url: true,
        slug: true,
        image: true,
        title: true,
        description: true,
          metadesc: true,
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

    // Invalidate cache for the new link
    if (!linkWithTags) {
      return NextResponse.json({ message: "Link not found" }, { status: 404 });
    }
    await invalidateLinkCache(linkWithTags?.slug, customDomainName || "slugy.co");

    // Send link metadata to Tinybird
    const linkMetadata = {
      link_id: linkWithTags.id,
      domain: customDomainName || "slugy.co", // Use custom domain if set, otherwise default
      slug: linkWithTags.slug,
      url: linkWithTags.url,
      tag_ids: linkWithTags.tags.map((t) => t.tag.id),
      workspace_id: workspaceCheck.workspace.id,
      created_at: linkWithTags.createdAt.toISOString(),
    };

    waitUntil(sendLinkMetadata(linkMetadata));

    return NextResponse.json(linkWithTags, {
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Error creating link:", error);
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
      { message: "An error occurred while creating the link." },
      { status: 500 },
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
