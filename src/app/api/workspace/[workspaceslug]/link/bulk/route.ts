import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { headers } from "next/headers";
import { checkWorkspaceAccessAndLimits } from "@/server/actions/limit";
import { invalidateLinkCacheBatch } from "@/lib/cache-utils/link-cache";
import { validateUrlSafety } from "@/server/actions/url-scan";
import { sendLinkMetadata } from "@/lib/tinybird/slugy-links-metadata";
import { waitUntil } from "@vercel/functions";
import { jsonWithETag } from "@/lib/http";
import { ensureCurrentUsageRecord } from "@/lib/usage/current-usage";
import { canUsePremiumLinkFeatures } from "@/lib/subscription/entitlements";

const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  7,
);

const DEFAULT_DOMAIN = "slugy.co";
const MAX_BULK_CREATE = 100;

const bulkLinkSchema = z.object({
  url: z.string().min(1, "URL is required").max(2048),
  slug: z.string().max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  utm_source: z.string().max(100).optional().nullable(),
  utm_medium: z.string().max(100).optional().nullable(),
  utm_campaign: z.string().max(100).optional().nullable(),
  utm_content: z.string().max(100).optional().nullable(),
  utm_term: z.string().max(100).optional().nullable(),
  customDomainId: z.string().optional().nullable(),
});

const bulkCreateSchema = z.object({
  links: z
    .array(bulkLinkSchema)
    .min(1, "At least one link is required")
    .max(MAX_BULK_CREATE, `Maximum ${MAX_BULK_CREATE} links per request`),
});

type RowError = { message: string; path: string[] };

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    const body = await req.json();
    const parsed = bulkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithETag(
        req,
        { message: "Invalid input data", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const workspaceCheck = await checkWorkspaceAccessAndLimits(
      session.user.id,
      context.workspaceslug,
    );
    if (!workspaceCheck.success || !workspaceCheck.workspace) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }

    const allowedToCreate =
      workspaceCheck.maxLinks - workspaceCheck.currentLinks;
    if (parsed.data.links.length > allowedToCreate) {
      return jsonWithETag(
        req,
        {
          error:
            "Link limit would be exceeded by this request. Reduce the batch size or upgrade your plan.",
          limitInfo: {
            currentLinks: workspaceCheck.currentLinks,
            maxLinks: workspaceCheck.maxLinks,
            planType: workspaceCheck.planType,
            attemptedToCreate: parsed.data.links.length,
            allowedToCreate,
          },
        },
        { status: 403 },
      );
    }

    // Resolve verified custom domains referenced by the batch.
    const customDomainIds = Array.from(
      new Set(
        parsed.data.links
          .map((l) => l.customDomainId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const customDomains = customDomainIds.length
      ? await db.customDomain.findMany({
          where: {
            id: { in: customDomainIds },
            workspaceId: workspaceCheck.workspace.id,
            verified: true,
            dnsConfigured: true,
          },
          select: { id: true, domain: true },
        })
      : [];
    const domainByCustomId = new Map(
      customDomains.map((d) => [d.id, d.domain]),
    );

    const failed: Array<{ index: number; errors: RowError[] }> = [];
    const valid: Array<{
      index: number;
      slug: string;
      url: string;
      domain: string;
      description?: string;
      tags: string[];
      expiresAt?: Date;
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      utm_content?: string | null;
      utm_term?: string | null;
    }> = [];
    const seenInBatch = new Set<string>();

    parsed.data.links.forEach((item, index) => {
      const rowErrors: RowError[] = [];
      const url = item.url.trim();
      if (!isHttpUrl(url)) {
        rowErrors.push({ message: "Invalid URL format", path: ["url"] });
      }

      let domain = DEFAULT_DOMAIN;
      if (item.customDomainId) {
        const resolved = domainByCustomId.get(item.customDomainId);
        if (!resolved) {
          rowErrors.push({
            message: "Invalid or unverified custom domain",
            path: ["customDomainId"],
          });
        } else {
          domain = resolved;
        }
      }

      let slug = (item.slug ?? "").trim() || nanoid();
      if (item.slug?.trim() && !/^[a-zA-Z0-9-]+$/.test(slug)) {
        rowErrors.push({
          message: "Slug can only contain letters, numbers, and hyphens",
          path: ["slug"],
        });
      }
      if (item.slug?.trim() && item.slug.trim().length < 3) {
        rowErrors.push({
          message: "Slug must be at least 3 characters if provided",
          path: ["slug"],
        });
      }
      const batchKey = `${domain}/${slug.toLowerCase()}`;
      if (seenInBatch.has(batchKey)) {
        rowErrors.push({
          message: "Duplicate slug in request",
          path: ["slug"],
        });
      } else {
        seenInBatch.add(batchKey);
      }

      let expiresAt: Date | undefined;
      if (item.expiresAt) {
        const parsedDate = new Date(item.expiresAt);
        if (Number.isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
          rowErrors.push({
            message: "expiresAt must be a valid future date",
            path: ["expiresAt"],
          });
        } else if (
          !canUsePremiumLinkFeatures(workspaceCheck.planType as string | null)
        ) {
          rowErrors.push({
            message: "Link expiration requires a Pro plan",
            path: ["expiresAt"],
          });
        } else {
          expiresAt = parsedDate;
        }
      }

      if (rowErrors.length > 0) {
        failed.push({ index, errors: rowErrors });
        return;
      }

      valid.push({
        index,
        slug,
        url,
        domain,
        description: item.description?.trim() || undefined,
        tags: Array.from(
          new Set((item.tags ?? []).map((t) => t.trim()).filter(Boolean)),
        ),
        expiresAt,
        utm_source: item.utm_source ?? undefined,
        utm_medium: item.utm_medium ?? undefined,
        utm_campaign: item.utm_campaign ?? undefined,
        utm_content: item.utm_content ?? undefined,
        utm_term: item.utm_term ?? undefined,
      });
    });

    // Pre-check slug conflicts scoped to (slug, domain) — slugs are only
    // unique per domain, so a global slug check would false-positive.
    if (valid.length > 0) {
      const existing = await db.link.findMany({
        where: {
          OR: valid.map((v) => ({ slug: v.slug, domain: v.domain })),
        },
        select: { slug: true, domain: true },
      });
      if (existing.length > 0) {
        const existingSet = new Set(
          existing.map((e) => `${e.domain}/${e.slug.toLowerCase()}`),
        );
        for (let i = valid.length - 1; i >= 0; i--) {
          const v = valid[i]!;
          if (existingSet.has(`${v.domain}/${v.slug.toLowerCase()}`)) {
            failed.push({
              index: v.index,
              errors: [{ message: "Slug already exists", path: ["slug"] }],
            });
            valid.splice(i, 1);
          }
        }
      }
    }

    // Safety-scan URLs (concurrency-limited, fail-open on scanner errors).
    const CONCURRENCY_LIMIT = 10;
    const unsafeIndexes = new Set<number>();
    for (let i = 0; i < valid.length; i += CONCURRENCY_LIMIT) {
      const batch = valid.slice(i, i + CONCURRENCY_LIMIT);
      const results = await Promise.all(
        batch.map(async (v) => {
          try {
            const result = await validateUrlSafety(v.url);
            return result.isValid ? null : v.index;
          } catch {
            return null;
          }
        }),
      );
      for (const index of results) {
        if (index !== null) unsafeIndexes.add(index);
      }
    }
    if (unsafeIndexes.size > 0) {
      for (let i = valid.length - 1; i >= 0; i--) {
        if (unsafeIndexes.has(valid[i]!.index)) {
          failed.push({
            index: valid[i]!.index,
            errors: [{ message: "URL failed the safety check", path: ["url"] }],
          });
          valid.splice(i, 1);
        }
      }
    }

    // Create survivors. Partial success: valid rows are created even if
    // other rows in the batch failed validation.
    const created: Array<{
      id: string;
      slug: string;
      url: string;
      domain: string;
    }> = [];
    const createdByIndex = new Map<number, { id: string; slug: string }>();
    if (valid.length > 0) {
      // Resolve tags up-front (same approach as CSV import), capped at
      // the owner's plan tag limit.
      const ownerPlan = await db.plan.findFirst({
        where: {
          planType:
            (workspaceCheck.planType as
              | "free"
              | "basic"
              | "pro"
              | "business") ?? "free",
        },
        select: { maxTagsPerWorkspace: true },
      });
      const maxTags = ownerPlan?.maxTagsPerWorkspace ?? 5;
      const allTagNames = Array.from(new Set(valid.flatMap((v) => v.tags)));
      const tagNameToId = new Map<string, string>();
      if (allTagNames.length > 0) {
        const existingTags = await db.tag.findMany({
          where: {
            workspaceId: workspaceCheck.workspace.id,
            name: { in: allTagNames },
          },
          select: { id: true, name: true },
        });
        for (const tag of existingTags) tagNameToId.set(tag.name, tag.id);
        const currentTagCount = await db.tag.count({
          where: { workspaceId: workspaceCheck.workspace.id, deletedAt: null },
        });
        const missing = allTagNames
          .filter((n) => !tagNameToId.has(n))
          .slice(0, Math.max(0, maxTags - currentTagCount));
        if (missing.length > 0) {
          await db.tag.createMany({
            data: missing.map((name) => ({
              name,
              workspaceId: workspaceCheck.workspace.id,
            })),
            skipDuplicates: true,
          });
          const refreshed = await db.tag.findMany({
            where: {
              workspaceId: workspaceCheck.workspace.id,
              name: { in: allTagNames },
            },
            select: { id: true, name: true },
          });
          for (const tag of refreshed) tagNameToId.set(tag.name, tag.id);
        }
      }

      await db.$transaction(async (tx) => {
        for (const v of valid) {
          try {
            const link = await tx.link.create({
              data: {
                workspaceId: workspaceCheck.workspace.id,
                userId: session.user.id,
                slug: v.slug,
                domain: v.domain,
                url: v.url,
                description: v.description,
                expiresAt: v.expiresAt,
                utm_source: v.utm_source,
                utm_medium: v.utm_medium,
                utm_campaign: v.utm_campaign,
                utm_content: v.utm_content,
                utm_term: v.utm_term,
                createdAt: new Date(),
              },
              select: { id: true, slug: true },
            });
            created.push({
              id: link.id,
              slug: link.slug,
              url: v.url,
              domain: v.domain,
            });
            createdByIndex.set(v.index, { id: link.id, slug: link.slug });
          } catch (error) {
            // Race on (slug, domain) — report instead of failing the batch.
            if (
              error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "P2002"
            ) {
              failed.push({
                index: v.index,
                errors: [{ message: "Slug already exists", path: ["slug"] }],
              });
              continue;
            }
            throw error;
          }
        }

        if (createdByIndex.size > 0) {
          const linkTags: Array<{ linkId: string; tagId: string }> = [];
          const seenPairs = new Set<string>();
          for (const v of valid) {
            const createdLink = createdByIndex.get(v.index);
            if (!createdLink) continue;
            for (const name of v.tags) {
              const tagId = tagNameToId.get(name);
              if (!tagId) continue;
              const key = `${createdLink.id}:${tagId}`;
              if (!seenPairs.has(key)) {
                seenPairs.add(key);
                linkTags.push({ linkId: createdLink.id, tagId });
              }
            }
          }
          if (linkTags.length > 0) {
            await tx.linkTag.createMany({
              data: linkTags,
              skipDuplicates: true,
            });
          }
        }
      });

      if (created.length > 0) {
        await db.$transaction(async (tx) => {
          const currentUsage = await ensureCurrentUsageRecord(tx, {
            workspaceId: workspaceCheck.workspace.id,
            userId: workspaceCheck.ownerUserId ?? session.user.id,
          });
          await Promise.all([
            tx.workspace.update({
              where: { id: workspaceCheck.workspace.id },
              data: { linksUsage: { increment: created.length } },
            }),
            tx.usage.update({
              where: { id: currentUsage.id },
              data: { linksCreated: { increment: created.length } },
            }),
          ]);
        });

        const byDomain = new Map<string, string[]>();
        for (const c of created) {
          const list = byDomain.get(c.domain) ?? [];
          list.push(c.slug);
          byDomain.set(c.domain, list);
        }
        await Promise.all(
          Array.from(byDomain.entries()).map(([domain, slugs]) =>
            invalidateLinkCacheBatch(slugs, domain),
          ),
        );

        for (const c of created) {
          const v = valid.find(
            (item) => item.slug === c.slug && item.domain === c.domain,
          );
          const tagIds = (v?.tags ?? [])
            .map((name) => tagNameToId.get(name))
            .filter((id): id is string => Boolean(id));
          waitUntil(
            sendLinkMetadata({
              link_id: c.id,
              domain: c.domain,
              slug: c.slug,
              url: c.url,
              tag_ids: tagIds,
              workspace_id: workspaceCheck.workspace.id,
              created_at: new Date().toISOString(),
            }),
          );
        }
      }
    }

    failed.sort((a, b) => a.index - b.index);
    const payload = {
      message:
        failed.length === 0
          ? `Successfully created ${created.length} links`
          : `Created ${created.length} links, ${failed.length} failed`,
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    };
    return jsonWithETag(req, payload, {
      status: created.length === 0 ? 400 : 200,
    });
  } catch (error) {
    console.error("Error bulk creating links:", error);
    if (error instanceof z.ZodError) {
      return jsonWithETag(
        req,
        { message: "Invalid input data", errors: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      return jsonWithETag(req, { message: error.message }, { status: 400 });
    }
    return jsonWithETag(
      req,
      { message: "An error occurred while creating links." },
      { status: 500 },
    );
  }
}
