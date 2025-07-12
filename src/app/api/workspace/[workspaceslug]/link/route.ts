import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { z } from "zod"; // Import zod for input validation
import { headers } from "next/headers";
import { checkWorkspaceAccessAndLimits } from "@/server/actions/limit";
import { invalidateLinkCache } from "@/lib/cache-utils";
const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  7,
);

// Updated input validation schema
const createLinkSchema = z.object({
  url: z.string().url(),
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

type CreateLinkRequest = z.infer<typeof createLinkSchema>;

// Helper function to check slug availability with optimized query
async function isSlugAvailable(slug: string) {
  const existingSlug = await db.link.findUnique({
    where: { slug },
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

    const shortUrlCode =
      validatedData.slug && validatedData.slug.trim() !== ""
        ? validatedData.slug
        : nanoid();

    if (!(await isSlugAvailable(shortUrlCode))) {
      return NextResponse.json(
        { message: "Slug already exists" },
        { status: 400 },
      );
    }

    // Use transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
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
        },
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
              workspaceId: workspaceCheck.workspace.id,
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
                    workspaceId: workspaceCheck.workspace.id,
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
    invalidateLinkCache(linkWithTags?.slug);

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
