import { db } from "@/server/db";
import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { apiSuccessPayload, apiErrorPayload } from "@/lib/api-response";
import { authenticateApiKey } from "@/lib/api-keys/auth";
import { checkLinkLimit } from "@/server/actions/limit";
import { getWorkspaceOwnerPlanType } from "@/lib/subscription/entitlements";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";
import { inngest } from "@/inngest/client";
import { setLinkCache } from "@/lib/cache-utils/link-cache";
import { sendLinkMetadata } from "@/lib/tinybird/slugy-links-metadata";
import { redis } from "@/lib/redis";
import { isRecursiveShortLink } from "@/lib/url-policy";
import { validateUrlSafety } from "@/server/actions/url-scan";
import { waitUntil } from "@vercel/functions";

const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  7,
);

const DEFAULT_DOMAIN = "slugy.co";
const MAX_TAGS_PER_WORKSPACE = 5;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

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
  expiresAt: z.string().datetime().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  customDomainId: z.string().optional().nullable(),
});

type CreateLinkRequest = z.infer<typeof createLinkSchema>;

function preprocessEmptyStrings(body: Record<string, unknown>) {
  return {
    ...body,
    image: body.image === "" ? null : body.image,
    title: body.title === "" ? null : body.title,
    description: body.description === "" ? null : body.description,
    metadesc: body.metadesc === "" ? null : body.metadesc,
    expiresAt: body.expiresAt === "" ? null : body.expiresAt,
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
  workspaceId: string,
  tagNames: string[],
): Promise<Array<{ id: string; name: string; color: string | null }>> {
  if (!tagNames.length) return [];

  const normalizedTagNames = Array.from(
    new Set(tagNames.map((name) => name.trim()).filter(Boolean)),
  );
  if (!normalizedTagNames.length) return [];

  const existingTags = await db.tag.findMany({
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
    const currentTagCount = await db.tag.count({
      where: { workspaceId, deletedAt: null },
    });
    const canCreateCount = Math.min(
      newTagNames.length,
      MAX_TAGS_PER_WORKSPACE - currentTagCount,
    );
    const tagNamesToCreate = newTagNames.slice(0, canCreateCount);

    if (tagNamesToCreate.length > 0) {
      await db.tag.createMany({
        data: tagNamesToCreate.map((name) => ({
          name,
          workspaceId,
          color: null,
        })),
        skipDuplicates: true,
      });
      allTags = await db.tag.findMany({
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

export async function POST(req: Request) {
  try {
    const auth = await authenticateApiKey(
      req.headers.get("authorization"),
      "write",
      "links",
    );

    if (!auth.ok) {
      return jsonWithETag(req, apiErrorPayload(auth.message, "UNAUTHORIZED"), {
        status: auth.status,
        headers: CORS_HEADERS,
      });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const validatedData = createLinkSchema.parse(
      preprocessEmptyStrings(body),
    ) as CreateLinkRequest;

    const workspace = await db.workspace.findFirst({
      where: { id: auth.apiKey.workspaceId, deletedAt: null },
      select: { id: true, name: true, slug: true, userId: true },
    });

    if (!workspace) {
      return jsonWithETag(
        req,
        apiErrorPayload("Workspace not found", "NOT_FOUND"),
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const [limitCheck, planType, customDomainRow, safetyResult] =
      await Promise.all([
        checkLinkLimit(workspace.userId, workspace.id),
        getWorkspaceOwnerPlanType(workspace.id),
        validatedData.customDomainId
          ? findVerifiedCustomDomain(validatedData.customDomainId)
          : Promise.resolve(null),
        validateUrlSafety(validatedData.url),
      ]);

    if (!limitCheck.canCreate) {
      return jsonWithETag(
        req,
        apiErrorPayload(
          limitCheck.message || "Link limit reached. Upgrade to Pro.",
          "FORBIDDEN",
          {
            currentLinks: limitCheck.currentCount,
            maxLinks: limitCheck.maxLimit,
            planType: limitCheck.planType ?? planType,
          },
        ),
        { status: 403, headers: CORS_HEADERS },
      );
    }

    let customDomainName: string | null = null;
    if (validatedData.customDomainId) {
      if (!customDomainRow || customDomainRow.workspaceId !== workspace.id) {
        return jsonWithETag(
          req,
          apiErrorPayload("Invalid or unverified custom domain", "BAD_REQUEST"),
          { status: 400, headers: CORS_HEADERS },
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
        { status: 400, headers: CORS_HEADERS },
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
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const slug = validatedData.slug?.trim() || nanoid();
    const domain = customDomainName || DEFAULT_DOMAIN;

    let result;
    try {
      const link = await db.link.create({
        data: {
          workspaceId: workspace.id,
          userId: workspace.userId,
          url: validatedData.url,
          slug,
          domain,
          image: validatedData.image,
          title: validatedData.title,
          description: validatedData.description,
          metadesc: validatedData.metadesc ?? null,
          ...(validatedData.expiresAt && {
            expiresAt: new Date(validatedData.expiresAt),
          }),
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
          expiresAt: true,
          utm_source: true,
          utm_medium: true,
          utm_campaign: true,
          utm_content: true,
          utm_term: true,
          createdAt: true,
        },
      });

      result = {
        ...link,
        shortUrl: `https://${link.domain}/${link.slug}`,
        tags: (validatedData.tags ?? [])
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({
            tag: { id: `pending:${name}`, name, color: null as string | null },
          })),
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
          { status: 400, headers: CORS_HEADERS },
        );
      }
      throw error;
    }

    waitUntil(
      (async () => {
        const assignedTags = validatedData.tags?.length
          ? await resolveWorkspaceTags(workspace.id, validatedData.tags)
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
          workspaceId: workspace.id,
          userId: workspace.userId,
        });

        await Promise.all([
          db.workspace.update({
            where: { id: workspace.id },
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
              expiresAt: null,
              expirationUrl: null,
              password: null,
              workspaceId: workspace.id,
              domain,
              title: result.title,
              image: result.image,
              metadesc: result.metadesc,
              description: result.description,
              geo: null,
              trackConversion: false,
            },
            domain,
          ),
          sendLinkMetadata({
            link_id: result.id,
            domain,
            slug: result.slug,
            url: result.url,
            tag_ids: tagIds,
            workspace_id: workspace.id,
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
              workspaceId: workspace.id,
              createdAt: result.createdAt.toISOString(),
            },
          }),
        ]);
      })(),
    );

    return jsonWithETag(req, apiSuccessPayload(result), {
      status: 201,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error("Error creating link via API key:", error);

    if (error instanceof z.ZodError) {
      return jsonWithETag(
        req,
        apiErrorPayload("Invalid input data", "VALIDATION_ERROR", error.errors),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    return jsonWithETag(
      req,
      apiErrorPayload(
        "An error occurred while creating the link.",
        "INTERNAL_ERROR",
      ),
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
