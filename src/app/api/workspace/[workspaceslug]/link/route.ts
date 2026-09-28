import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";
import { z } from "zod";
import { headers } from "next/headers";
import {
  SlugConflictError,
  validateLinkExpiry,
  validateLinkSlug,
} from "@/lib/link-slug";
import { createLinkWithQuota, QuotaExceededError } from "@/lib/usage/quota";
import { checkWorkspaceAccessAndLimits } from "@/server/actions/limit";
import {
  canUseLeadTracking,
  canUsePremiumLinkFeatures,
  getWorkspaceOwnerPlanTypeBySlug,
} from "@/lib/subscription/entitlements";
import { waitUntil } from "@vercel/functions";
import { apiSuccessPayload, apiErrorPayload } from "@/lib/api-response";
import { Prisma } from "@prisma/client";
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
import {
  canUseGeoTargeting,
  geoTargetSchema,
  normalizeGeoInput,
  type GeoTargetMap,
} from "@/lib/link-targeting";

const DEFAULT_DOMAIN = "slugy.co";
const MAX_TAGS_PER_WORKSPACE = 5;

// Input validation schema
const createLinkSchema = z
  .object({
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
    geo: geoTargetSchema,
    tags: z.array(z.string()).optional(),
    customDomainId: z.string().optional().nullable(),
    trackConversion: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    // Custom slugs share path space with app/marketing routes — a stored but
    // shadowed slug ("login", "pricing", "b", …) would never redirect.
    const rawSlug = data.slug?.trim();
    if (rawSlug) {
      const slugCheck = validateLinkSlug(rawSlug);
      if (!slugCheck.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: slugCheck.message,
          path: ["slug"],
        });
      }
    }

    const expiryCheck = validateLinkExpiry({
      expiresAt: data.expiresAt,
      expirationUrl: data.expirationUrl,
      url: data.url,
    });
    if (!expiryCheck.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: expiryCheck.message,
        path: [expiryCheck.path],
      });
    }
  });

type CreateLinkRequest = z.infer<typeof createLinkSchema>;

// Helper: Convert empty strings to null
function preprocessEmptyStrings(body: Record<string, unknown>) {
  return {
    ...body,
    image: body.image === "" ? null : body.image,
    title: body.title === "" ? null : body.title,
    description: body.description === "" ? null : body.description,
    metadesc: body.metadesc === "" ? null : body.metadesc,
    password: body.password === "" ? null : body.password,
    expiresAt: body.expiresAt === "" ? null : body.expiresAt,
    expirationUrl: body.expirationUrl === "" ? null : body.expirationUrl,
    geo: normalizeGeoInput(body.geo),
  };
}

async function assertTargetUrlsSafe(
  urls: Array<string | null | undefined>,
  customDomains: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (const url of urls) {
    if (!url) continue;
    const check = await assertSafeDestinationUrl(url, {
      customDomains,
      skipSafetyScan: true,
    });
    if (!check.ok) return check;
  }
  return { ok: true };
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
  maxTags: number = MAX_TAGS_PER_WORKSPACE,
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
      Math.max(0, maxTags - currentTagCount),
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
      req.json() as Promise<Record<string, unknown>>,
    ]);

    if (!session) {
      return jsonWithETag(
        req,
        apiErrorPayload("Unauthorized", "UNAUTHORIZED"),
        { status: 401 },
      );
    }

    const validatedData = createLinkSchema.parse(preprocessEmptyStrings(body));

    const [workspaceCheck, customDomainRow, safetyResult, planType] =
      await Promise.all([
        checkWorkspaceAccessAndLimits(session.user.id, context.workspaceslug),
        validatedData.customDomainId
          ? findVerifiedCustomDomain(validatedData.customDomainId)
          : Promise.resolve(null),
        validateUrlSafety(validatedData.url),
        getWorkspaceOwnerPlanTypeBySlug(context.workspaceslug),
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

    const geo = (validatedData.geo ?? null) as GeoTargetMap | null;
    // Prefer the plan resolved alongside the limit check (that call also
    // auto-provisions Free for legacy users, so this is never stale).
    const effectivePlanType = workspaceCheck.planType ?? planType;

    if (geo && !canUseGeoTargeting(effectivePlanType)) {
      return jsonWithETag(
        req,
        apiErrorPayload("Geo targeting requires a Pro plan.", "FORBIDDEN"),
        { status: 403 },
      );
    }

    const trackConversion =
      canUseLeadTracking(effectivePlanType) &&
      (validatedData.trackConversion ?? false);

    if (
      !canUsePremiumLinkFeatures(effectivePlanType) &&
      (validatedData.password || validatedData.expiresAt)
    ) {
      return jsonWithETag(
        req,
        apiErrorPayload(
          "Password protection and link expiration require a Pro plan.",
          "FORBIDDEN",
        ),
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

    const geoUrls = geo ? Object.values(geo) : [];
    const targetingCheck = await assertTargetUrlsSafe(geoUrls, customDomains);
    if (!targetingCheck.ok) {
      return jsonWithETag(
        req,
        apiErrorPayload(targetingCheck.message, "BAD_REQUEST"),
        { status: 400 },
      );
    }

    const customSlug = validatedData.slug?.trim() || null;
    const domain = customDomainName || DEFAULT_DOMAIN;
    const storedPassword = validatedData.password
      ? hashLinkPassword(validatedData.password)
      : null;

    // Plan tag cap resolves before creation — tags now persist synchronously.
    const ownerPlan = await db.plan.findFirst({
      where: {
        planType:
          (workspaceCheck.planType as "free" | "basic" | "pro" | "growth") ??
          "free",
      },
      select: { maxTagsPerWorkspace: true },
    });
    const maxTags = ownerPlan?.maxTagsPerWorkspace ?? MAX_TAGS_PER_WORKSPACE;

    const linkSelect = {
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
      geo: true,
      trackConversion: true,
      createdAt: true,
    } as const;

    const buildLinkData = (slug: string) => ({
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
      geo: geo ?? Prisma.JsonNull,
      customDomainId: validatedData.customDomainId || null,
      trackConversion,
    });

    // Quota reservation + link + tags commit atomically (usage row locked
    // FOR UPDATE): concurrent POSTs serialize instead of jointly overshooting,
    // and no background task can drop the counters.
    let link;
    let assignedTags: Array<{ id: string; name: string; color: string | null }>;
    try {
      const created = await createLinkWithQuota(
        {
          workspaceId: workspaceCheck.workspace.id,
          ownerUserId: workspaceCheck.ownerUserId ?? session.user.id,
          maxLinks: workspaceCheck.maxLinks,
          customSlug,
        },
        async (tx, slug) => {
          const newLink = await tx.link.create({
            data: buildLinkData(slug),
            select: linkSelect,
          });
          const tags = validatedData.tags?.length
            ? await resolveWorkspaceTags(
                tx,
                workspaceCheck.workspace.id,
                validatedData.tags,
                maxTags,
              )
            : [];
          if (tags.length > 0) {
            await tx.linkTag.createMany({
              data: tags.map((tag) => ({
                linkId: newLink.id,
                tagId: tag.id,
              })),
              skipDuplicates: true,
            });
          }
          return { link: newLink, assignedTags: tags };
        },
      );
      link = created.link;
      assignedTags = created.assignedTags;
    } catch (error: unknown) {
      if (error instanceof SlugConflictError) {
        return jsonWithETag(req, apiErrorPayload(error.message, "CONFLICT"), {
          status: 409,
        });
      }
      if (error instanceof QuotaExceededError) {
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
      throw error;
    }

    const tagIds = assignedTags.map((tag) => tag.id);

    const result = {
      ...link,
      password: maskLinkPassword(link.password),
      geo: (link.geo as GeoTargetMap | null) ?? null,
      tags: assignedTags.map((tag) => ({
        tag: { id: tag.id, name: tag.name, color: tag.color },
      })),
      qrCode: { id: "", customization: "" },
      lastClicked: null,
      creator: {
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      },
    };

    // Rebuildable side-effects only: the redirect path falls back to the DB
    // on cache miss and repairs Tinybird metadata on first click, so these
    // can safely run off the critical path.
    waitUntil(
      (async () => {
        await Promise.all([
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
              geo: (result.geo as GeoTargetMap | null) ?? null,
              trackConversion: Boolean(result.trackConversion),
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
