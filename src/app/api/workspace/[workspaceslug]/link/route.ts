import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { headers } from "next/headers";
import { checkWorkspaceAccessAndLimits } from "@/server/actions/limit";
import { waitUntil } from "@vercel/functions";
import { apiSuccessPayload, apiErrorPayload } from "@/lib/api-response";
import { Prisma } from "@prisma/client";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";
import { inngest } from "@/inngest/client";
import { setLinkCache } from "@/lib/cache-utils/link-cache";
import { hashLinkPassword, maskLinkPassword } from "@/lib/link-password";
import {
  assertSafeDestinationUrl,
  isRecursiveShortLink,
} from "@/lib/url-policy";
import { validateUrlSafety } from "@/server/actions/url-scan";
import { sendLinkMetadata } from "@/lib/tinybird/slugy-links-metadata";
import { redis } from "@/lib/redis";

const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  7,
);

const DEFAULT_DOMAIN = "slugy.co";
const MAX_TAGS_PER_WORKSPACE = 5;

// Input validation schema
const createLinkSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (value) => {
        try {
          const protocol = new URL(value).protocol;
          return protocol === "http:" || protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Only http(s) URLs are allowed" },
    ),
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
  expirationUrl: z
    .string()
    .url()
    .refine(
      (value) => {
        try {
          const protocol = new URL(value).protocol;
          return protocol === "http:" || protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Only http(s) expiration URLs are allowed" },
    )
    .optional()
    .nullable(),
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

async function findVerifiedCustomDomain(customDomainId: string) {
  return db.customDomain.findFirst({
    where: {
      id: customDomainId,
      verified: true,
      dnsConfigured: true,
    },
    select: { domain: true, workspaceId: true },
  });
}

async function resolveWorkspaceTags(
  tx: Prisma.TransactionClient | typeof db,
  workspaceId: string,
  tagNames: string[],
): Promise<Array<{ id: string; name: string; color: string | null }>> {
  if (!tagNames.length) return [];

  const normalizedTagNames = Array.from(
    new Set(tagNames.map((name) => name.trim()).filter(Boolean)),
  );

  if (!normalizedTagNames.length) return [];

  const existingTags = await tx.tag.findMany({
    where: {
      workspaceId,
      name: { in: normalizedTagNames },
      deletedAt: null,
    },
    select: { id: true, name: true, color: true },
  });

  const existingTagNames = new Set(existingTags.map((tag) => tag.name));
  const newTagNames = normalizedTagNames.filter(
    (name) => !existingTagNames.has(name),
  );

  let allTags: Array<{ id: string; name: string; color: string | null }> = [
    ...existingTags,
  ];

  if (newTagNames.length > 0) {
    const currentTagCount = await tx.tag.count({
      where: { workspaceId, deletedAt: null },
    });

    const canCreateCount = Math.min(
      newTagNames.length,
      MAX_TAGS_PER_WORKSPACE - currentTagCount,
    );

    const tagNamesToCreate = newTagNames.slice(0, canCreateCount);
    if (tagNamesToCreate.length > 0) {
      await tx.tag.createMany({
        data: tagNamesToCreate.map((name) => ({
          name,
          workspaceId,
          color: null,
        })),
        skipDuplicates: true,
      });

      allTags = await tx.tag.findMany({
        where: {
          workspaceId,
          name: {
            in: [...existingTags.map((tag) => tag.name), ...tagNamesToCreate],
          },
          deletedAt: null,
        },
        select: { id: true, name: true, color: true },
      });
    }
  }

  return allTags;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const [headersList, context] = await Promise.all([headers(), params]);
    const [session, body] = await Promise.all([
      auth.api.getSession({ headers: headersList }),
      req.json() as Promise<CreateLinkRequest>,
    ]);

    if (!session) {
      return jsonWithETag(
        req,
        apiErrorPayload("Unauthorized", "UNAUTHORIZED"),
        { status: 401 },
      );
    }

    const validatedData = createLinkSchema.parse(preprocessEmptyStrings(body));

    const [workspaceCheck, customDomainRow, safetyResult] = await Promise.all([
      checkWorkspaceAccessAndLimits(session.user.id, context.workspaceslug),
      validatedData.customDomainId
        ? findVerifiedCustomDomain(validatedData.customDomainId)
        : Promise.resolve(null),
      validateUrlSafety(validatedData.url),
    ]);

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

    let customDomainName: string | null = null;
    if (validatedData.customDomainId) {
      if (
        !customDomainRow ||
        customDomainRow.workspaceId !== workspaceCheck.workspace.id
      ) {
        return jsonWithETag(
          req,
          apiErrorPayload("Invalid or unverified custom domain", "BAD_REQUEST"),
          { status: 400 },
        );
      }
      customDomainName = customDomainRow.domain;
    }

    const customDomains = customDomainName ? [customDomainName] : [];
    if (isRecursiveShortLink(validatedData.url, customDomains)) {
      return jsonWithETag(
        req,
        apiErrorPayload(
          "Recursive links are not allowed. You cannot shorten a Slugy or custom-domain short link.",
          "BAD_REQUEST",
        ),
        { status: 400 },
      );
    }

    if (!safetyResult.isValid) {
      return jsonWithETag(
        req,
        apiErrorPayload(
          safetyResult.message ||
            "This URL failed the safety check and cannot be shortened.",
          "BAD_REQUEST",
        ),
        { status: 400 },
      );
    }

    if (validatedData.expirationUrl) {
      const expCheck = await assertSafeDestinationUrl(
        validatedData.expirationUrl,
        {
          customDomains,
          skipSafetyScan: true,
        },
      );
      if (!expCheck.ok) {
        return jsonWithETag(
          req,
          apiErrorPayload(expCheck.message, "BAD_REQUEST"),
          { status: 400 },
        );
      }
    }

    const slug = validatedData.slug?.trim() || nanoid();
    const domain = customDomainName || DEFAULT_DOMAIN;
    const storedPassword = validatedData.password
      ? hashLinkPassword(validatedData.password)
      : null;

    // Create the link first, then finish counters/side-effects off the critical path.
    // Interactive Prisma transactions on Neon serverless commonly add multiple seconds.
    let result;
    try {
      const link = await db.link.create({
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
          password: storedPassword,
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
          domain: true,
          clicks: true,
          isArchived: true,
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

      // Tags resolve in waitUntil; return provisional names so the UI can paint immediately.
      const provisionalTags = (validatedData.tags ?? [])
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({
          tag: { id: `pending:${name}`, name, color: null as string | null },
        }));

      result = {
        ...link,
        password: maskLinkPassword(link.password),
        tags: provisionalTags,
        qrCode: { id: "", customization: "" },
        lastClicked: null,
        creator: {
          name: session.user.name ?? null,
          image: session.user.image ?? null,
        },
      };
    } catch (error: unknown) {
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

    waitUntil(
      (async () => {
        const assignedTags = validatedData.tags?.length
          ? await resolveWorkspaceTags(
              db,
              workspaceCheck.workspace.id,
              validatedData.tags,
            )
          : [];

        if (assignedTags.length > 0) {
          await db.linkTag.createMany({
            data: assignedTags.map((tag) => ({
              linkId: result.id,
              tagId: tag.id,
            })),
            skipDuplicates: true,
          });
        }

        const tagIds = assignedTags.map((tag) => tag.id);

        const currentUsage = await ensureCurrentUsageRecord(db, {
          workspaceId: workspaceCheck.workspace.id,
          userId: session.user.id,
        });

        await Promise.all([
          db.workspace.update({
            where: { id: workspaceCheck.workspace.id },
            data: { linksUsage: { increment: 1 } },
          }),
          db.usage.update({
            where: { id: currentUsage.id },
            data: { linksCreated: { increment: 1 } },
          }),
          setLinkCache(
            result.slug,
            {
              id: result.id,
              url: result.url,
              expiresAt: result.expiresAt
                ? result.expiresAt.toISOString()
                : null,
              expirationUrl: result.expirationUrl,
              password: storedPassword ? "1" : null,
              workspaceId: workspaceCheck.workspace.id,
              domain,
              title: result.title,
              image: result.image,
              metadesc: result.metadesc,
              description: result.description,
            },
            domain,
          ),
          // Direct Tinybird metadata write (don't rely only on Inngest —
          // analytics_pipe INNER JOINs metadata; missing rows → 0 clicks UI)
          sendLinkMetadata({
            link_id: result.id,
            domain,
            slug: result.slug,
            url: result.url,
            tag_ids: tagIds,
            workspace_id: workspaceCheck.workspace.id,
            created_at: result.createdAt.toISOString(),
          }).then(() =>
            redis
              .set(`tb:meta:${result.id}`, "1", { ex: 60 * 60 * 24 * 30 })
              .catch(() => undefined),
          ),
          inngest.send({
            name: "app/link.created",
            data: {
              linkId: result.id,
              domain,
              slug: result.slug,
              url: result.url,
              tagIds,
              workspaceId: workspaceCheck.workspace.id,
              createdAt: result.createdAt.toISOString(),
            },
          }),
        ]);
      })(),
    );

    return jsonWithETag(req, apiSuccessPayload(result), {
      status: 201,
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
