import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { headers } from "next/headers";
import { checkWorkspaceAccessAndLimits } from "@/server/actions/limit";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";
import { waitUntil } from "@vercel/functions";
import { sendLinkMetadata } from "@/lib/tinybird/slugy-links-metadata";
import { apiSuccessPayload, apiErrorPayload } from "@/lib/api-response";

const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  7,
);

const RECURSIVE_LINK_PATTERN =
  /^https?:\/\/(www\.)?(slugy\.co)(:[0-9]+)?\/[a-zA-Z0-9_-]{1,50}$/;
const DEFAULT_DOMAIN = "slugy.co";
const MAX_TAGS_PER_WORKSPACE = 5;

// Input validation schema
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

// Helper: Convert empty strings to null
function preprocessEmptyStrings(body: CreateLinkRequest): CreateLinkRequest {
  return {
    ...body,
    image: body.image === "" ? null : body.image,
    title: body.title === "" ? null : body.title,
    description: body.description === "" ? null : body.description,
    metadesc: body.metadesc === "" ? null : body.metadesc,
    password: body.password === "" ? null : body.password,
    expiresAt: body.expiresAt === "" ? null : body.expiresAt,
    expirationUrl: body.expirationUrl === "" ? null : body.expirationUrl,
  };
}

// Helper: Check slug availability
async function isSlugAvailable(
  slug: string,
  domain: string = DEFAULT_DOMAIN,
): Promise<boolean> {
  const existingSlug = await db.link.findFirst({
    where: { slug, domain },
    select: { id: true },
  });
  return !existingSlug;
}

// Helper: Verify and get custom domain
async function verifyCustomDomain(
  customDomainId: string,
  workspaceId: string,
): Promise<string | null> {
  const customDomain = await db.customDomain.findFirst({
    where: {
      id: customDomainId,
      workspaceId,
      verified: true,
      dnsConfigured: true,
    },
    select: { domain: true },
  });
  return customDomain?.domain || null;
}

// Helper: Handle tag creation and assignment
async function handleTags(
  tx: any,
  linkId: string,
  workspaceId: string,
  tagNames: string[],
): Promise<void> {
  if (!tagNames.length) return;

  // Fetch existing tags
  const existingTags = await tx.tag.findMany({
    where: {
      workspaceId,
      name: { in: tagNames },
      deletedAt: null,
    },
    select: { id: true, name: true },
  });

  const existingTagNames = existingTags.map(
    (tag: { id: string; name: string }) => tag.name,
  );
  const newTagNames = tagNames.filter(
    (name) => !existingTagNames.includes(name),
  );

  let allTags = [...existingTags];

  // Create new tags if needed and within limit
  if (newTagNames.length > 0) {
    const currentTagCount = await tx.tag.count({
      where: { workspaceId, deletedAt: null },
    });

    const canCreateCount = Math.min(
      newTagNames.length,
      MAX_TAGS_PER_WORKSPACE - currentTagCount,
    );

    if (canCreateCount > 0) {
      const createdTags = await Promise.all(
        newTagNames.slice(0, canCreateCount).map((name) =>
          tx.tag.create({
            data: { name, workspaceId, color: null },
            select: { id: true, name: true },
          }),
        ),
      );
      allTags = [...existingTags, ...createdTags];
    }
  }

  // Create link-tag relationships
  if (allTags.length > 0) {
    await tx.linkTag.createMany({
      data: allTags.map((tag) => ({ linkId, tagId: tag.id })),
      skipDuplicates: true,
    });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    // Authentication
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return jsonWithETag(
        req,
        apiErrorPayload("Unauthorized", "UNAUTHORIZED"),
        { status: 401 },
      );
    }

    // Parse and validate input
    const body = (await req.json()) as CreateLinkRequest;
    const validatedData = createLinkSchema.parse(preprocessEmptyStrings(body));

    // Check workspace access and limits
    const context = await params;
    const workspaceCheck = await checkWorkspaceAccessAndLimits(
      session.user.id,
      context.workspaceslug,
    );

    if (!workspaceCheck.success || !workspaceCheck.workspace) {
      return jsonWithETag(
        req,
        apiErrorPayload("Unauthorized", "UNAUTHORIZED"),
        { status: 401 },
      );
    }

    if (!workspaceCheck.canCreateLinks) {
      return jsonWithETag(
        req,
        apiErrorPayload("Link limit reached. Upgrade to Pro.", "FORBIDDEN", {
          currentLinks: workspaceCheck.currentLinks,
          maxLinks: workspaceCheck.maxLinks,
          planType: workspaceCheck.planType,
        }),
        { status: 403 },
      );
    }

    // Prevent recursive links
    if (RECURSIVE_LINK_PATTERN.test(validatedData.url)) {
      return jsonWithETag(
        req,
        apiErrorPayload(
          "Recursive links are not allowed. You cannot shorten a slugy.co link.",
          "BAD_REQUEST",
        ),
        { status: 400 },
      );
    }

    // Verify custom domain if provided
    let customDomainName: string | null = null;
    if (validatedData.customDomainId) {
      customDomainName = await verifyCustomDomain(
        validatedData.customDomainId,
        workspaceCheck.workspace.id,
      );
      if (!customDomainName) {
        return jsonWithETag(
          req,
          apiErrorPayload("Invalid or unverified custom domain", "BAD_REQUEST"),
          { status: 400 },
        );
      }
    }

    // Generate or use provided slug
    const slug = validatedData.slug?.trim() || nanoid();
    const domain = customDomainName || DEFAULT_DOMAIN;

    // Check slug availability
    if (!(await isSlugAvailable(slug, domain))) {
      return jsonWithETag(
        req,
        apiErrorPayload("Slug already exists for this domain!", "CONFLICT"),
        { status: 400 },
      );
    }

    // Create link in transaction
    let result;
    try {
      result = await db.$transaction(async (tx) => {
        const link = await tx.link.create({
          data: {
            workspaceId: workspaceCheck.workspace.id,
            userId: session.user.id,
            url: validatedData.url,
            slug,
            domain,
            image: validatedData.image,
            title: validatedData.title,
            description: validatedData.description,
            metadesc: validatedData.metadesc ?? null,
            password: validatedData.password,
            ...(validatedData.expiresAt && {
              expiresAt: new Date(validatedData.expiresAt),
            }),
            expirationUrl: validatedData.expirationUrl,
            utm_source: validatedData.utm_source,
            utm_medium: validatedData.utm_medium,
            utm_campaign: validatedData.utm_campaign,
            utm_content: validatedData.utm_content,
            utm_term: validatedData.utm_term,
            customDomainId: validatedData.customDomainId || null,
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

        // Handle tags
        if (validatedData.tags?.length) {
          await handleTags(
            tx,
            link.id,
            workspaceCheck.workspace.id,
            validatedData.tags,
          );
        }

        // Update workspace and usage stats
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
        error.code === "P2002"
      ) {
        return jsonWithETag(
          req,
          apiErrorPayload("Slug already exists for this domain!", "CONFLICT"),
          { status: 400 },
        );
      }
      throw error;
    }

    // Fetch complete link with tags
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

    if (!linkWithTags) {
      return jsonWithETag(req, apiErrorPayload("Link not found", "NOT_FOUND"), {
        status: 404,
      });
    }

    // Invalidate cache and send metadata (non-blocking)
    await invalidateLinkCache(linkWithTags.slug, domain);

    waitUntil(
      sendLinkMetadata({
        link_id: linkWithTags.id,
        domain,
        slug: linkWithTags.slug,
        url: linkWithTags.url,
        tag_ids: linkWithTags.tags.map((t) => t.tag.id),
        workspace_id: workspaceCheck.workspace.id,
        created_at: linkWithTags.createdAt.toISOString(),
      }),
    );

    return jsonWithETag(req, apiSuccessPayload(linkWithTags), {
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
      return jsonWithETag(
        req,
        apiErrorPayload("Invalid input data", "VALIDATION_ERROR", error.errors),
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      const isNotFound = error.message.includes("not found");
      return jsonWithETag(
        req,
        apiErrorPayload(
          error.message,
          isNotFound ? "NOT_FOUND" : "BAD_REQUEST",
        ),
        { status: isNotFound ? 404 : 400 },
      );
    }

    return jsonWithETag(
      req,
      apiErrorPayload(
        "An error occurred while creating the link.",
        "INTERNAL_ERROR",
      ),
      { status: 500 },
    );
  }
}

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
