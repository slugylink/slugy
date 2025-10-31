import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { parse as csvParse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { headers } from "next/headers";
import { checkWorkspaceAccessAndLimits } from "@/server/actions/limit";
import { invalidateLinkCacheBatch } from "@/lib/cache-utils/link-cache";
import { validateUrlSafety } from "@/server/actions/url-scan";
import { sendLinkMetadata } from "@/lib/tinybird/slugy-links-metadata";
import { waitUntil } from "@vercel/functions";
import { jsonWithETag } from "@/lib/http";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params for date range
    const url = new URL(req.url);
    const dateRange = url.searchParams.get("dateRange") || "all";
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    let from: Date | undefined = undefined;
    let to: Date | undefined = undefined;
    const now = new Date();

    switch (dateRange) {
      case "24h":
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3m":
        from = new Date(now);
        from.setMonth(from.getMonth() - 3);
        break;
      case "custom":
        if (fromParam) from = new Date(fromParam);
        if (toParam) to = new Date(toParam);
        break;
      case "all":
      default:
        // No filter
        break;
    }

    // Define allowed columns and their DB field mappings to match frontend COLUMNS
    const columnMap: Record<string, string> = {
      slug: "slug",
      url: "url",
      clicks: "clicks",
      createdAt: "createdAt",
      link_id: "id",
      updatedAt: "updatedAt",
      tags: "tags",
      archived: "archived",
    };
    const allowedColumns = Object.keys(columnMap);
    let columns: string[] = ["slug", "url", "clicks", "createdAt"];
    const columnsParam = url.searchParams.get("columns");
    if (columnsParam) {
      columns = columnsParam
        .split(",")
        .map((c) => c.trim())
        .filter((c) => allowedColumns.includes(c));
      if (columns.length === 0) {
        columns = ["slug", "url", "clicks", "createdAt"];
      }
    }

    const context = await params;

    // Optimize workspace query
    const workspace = await db.workspace.findFirst({
      where: {
        slug: context.workspaceslug,
        OR: [
          { userId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!workspace) {
      return jsonWithETag(req, { message: "Workspace not found" }, { status: 404 });
    }

    // Build where clause for date filtering
    const linkWhere: Record<string, unknown> = { workspaceId: workspace.id };
    if (from && to) {
      linkWhere.createdAt = { gte: from, lte: to };
    } else if (from) {
      linkWhere.createdAt = { gte: from };
    } else if (to) {
      linkWhere.createdAt = { lte: to };
    }

    // Build select object for Prisma
    const select: Record<string, true> = {};
    columns.forEach((col) => {
      const dbField = columnMap[col];
      if (dbField) select[dbField] = true;
    });

    const links = await db.link.findMany({
      where: linkWhere,
      select,
      orderBy: { createdAt: "desc" },
    });

    // Format links for CSV output
    const formattedLinks = links.map((link) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col) => {
        const dbField = columnMap[col];
        const value = link[dbField];
        if (
          (col === "createdAt" || col === "updatedAt") &&
          value instanceof Date
        ) {
          obj[col] = value.toISOString();
        } else if (col === "tags" && Array.isArray(value)) {
          obj[col] = value.join(",");
        } else {
          obj[col] = value;
        }
      });
      return obj;
    });

    const csvContent = stringify(formattedLinks, {
      header: true,
      columns,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="links_${context.workspaceslug}_${new Date().toISOString()}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error getting links as CSV:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: error.message.includes("not found") ? 404 : 400 },
      );
    }
    return NextResponse.json(
      { message: "An error occurred while getting links as CSV." },
      { status: 500 },
    );
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

    // Validate workspace access and limits
    const workspaceCheck = await checkWorkspaceAccessAndLimits(
      session.user.id,
      context.workspaceslug,
    );

    if (!workspaceCheck.success || !workspaceCheck.workspace) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!workspaceCheck.canCreateLinks) {
      return jsonWithETag(
        req,
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

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return jsonWithETag(req, { message: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      return jsonWithETag(req, { message: "Invalid file type. Please upload a CSV file." }, { status: 400 });
    }

    // Read and parse CSV
    const csvText = await file.text();
    const records = csvParse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return jsonWithETag(req, { message: "CSV file is empty or has no valid data" }, { status: 400 });
    }

    // Add warning for very large files
    if (records.length > 5000) {
      console.warn(`Large CSV import detected: ${records.length} records. This may take several minutes to process.`);
    }

    // Check if importing these links would exceed the allowed limit
    const allowedToCreate = workspaceCheck.maxLinks - workspaceCheck.currentLinks;
    if (records.length > allowedToCreate) {
      return NextResponse.json(
        {
          error: "Link limit would be exceeded by this import. Please reduce the number of links or upgrade your plan.",
          limitInfo: {
            currentLinks: workspaceCheck.currentLinks,
            maxLinks: workspaceCheck.maxLinks,
            planType: workspaceCheck.planType,
            attemptedToImport: records.length,
            allowedToImport: allowedToCreate,
          },
        },
        { status: 403 },
      );
    }

    const nanoid = customAlphabet(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      7,
    );

    const errors: Array<{
      row: number;
      errors: Array<{ message: string; path: string[] }>;
    }> = [];

    const linksToCreate: Array<{
      slug: string;
      url: string;
      description?: string;
      workspaceId: string;
      userId: string;
      createdAt: Date;
    }> = [];

    const tagsToCreate: Array<{
      linkSlug: string;
      tagNames: string[];
    }> = [];

    const urlsToScan: Array<{ url: string; row: number }> = [];
    const seenSlugsInCsv = new Set<string>();

    // Process each row
    records.forEach((record: Record<string, unknown>, index: number) => {
      const rowErrors: Array<{ message: string; path: string[] }> = [];
      const rowNumber = index + 2; // +2 because index is 0-based and we have header

      // Validate required fields
      const url = record.url as string;
      if (!url || typeof url !== "string" || url.trim() === "") {
        rowErrors.push({
          message: "URL is required",
          path: ["url"],
        });
      } else {
        try {
          new URL(url);
          // Add valid URLs to scanning queue
          urlsToScan.push({ url: url.trim(), row: rowNumber });
        } catch {
          rowErrors.push({
            message: "Invalid URL format",
            path: ["url"],
          });
        }
      }

      // Generate slug if not provided
      let slug = record.slug as string;
      if (!slug || typeof slug !== "string" || slug.trim() === "") {
        slug = nanoid();
      } else {
        // Validate slug format (alphanumeric and hyphens only)
        if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
          rowErrors.push({
            message: "Slug can only contain letters, numbers, and hyphens",
            path: ["slug"],
          });
        }
        // Detect duplicate slugs within the CSV itself
        if (seenSlugsInCsv.has(slug)) {
          rowErrors.push({
            message: "Duplicate slug in CSV",
            path: ["slug"],
          });
        } else {
          seenSlugsInCsv.add(slug);
        }
      }

      // Process tags
      let tags: string[] = [];
      const tagsStr = record.tags as string;
      if (tagsStr && typeof tagsStr === "string") {
        tags = tagsStr
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean);
      }

      // Process description
      const description = record.description as string;
      const descriptionStr =
        description && typeof description === "string"
          ? description.trim()
          : undefined;

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNumber,
          errors: rowErrors,
        });
      } else {
        linksToCreate.push({
          workspaceId: workspaceCheck.workspace.id,
          userId: session.user.id,
          slug,
          url: url.trim(),
          description: descriptionStr,
          createdAt: new Date(),
        });

        if (tags.length > 0) {
          tagsToCreate.push({
            linkSlug: slug,
            tagNames: tags,
          });
        }
      }
    });

    // If there are validation errors, return them
    if (errors.length > 0) {
      return jsonWithETag(
        req,
        {
          message: "Validation errors found in CSV",
          errors,
        },
        { status: 400 },
      );
    }

    // Pre-check for existing slugs in the database to provide clearer errors up-front
    const requestedSlugs = linksToCreate.map((l) => l.slug);
    if (requestedSlugs.length > 0) {
      const existing = await db.link.findMany({
        where: {
          slug: { in: requestedSlugs },
        },
        select: { slug: true },
      });
      if (existing.length > 0) {
        const existingSet = new Set(existing.map((e) => e.slug));
        const conflictErrors = records
          .map((record: Record<string, unknown>, index: number) => {
            const slug = (record.slug as string) || "";
            if (slug && existingSet.has(slug)) {
              return {
                row: index + 2,
                errors: [
                  {
                    message: "Slug already exists",
                    path: ["slug"],
                  },
                ],
              };
            }
            return null;
          })
          .filter(Boolean) as Array<{ row: number; errors: Array<{ message: string; path: string[] }> }>;
        if (conflictErrors.length > 0) {
          return jsonWithETag(
            req,
            {
              message: "Validation errors found in CSV",
              errors: conflictErrors,
            },
            { status: 400 },
          );
        }
      }
    }

    // Scan URLs for safety in parallel (with concurrency limit)
    console.log(`Scanning ${urlsToScan.length} URLs for safety...`);
    const CONCURRENCY_LIMIT = 10; // Limit concurrent requests to avoid overwhelming the API
    const unsafeUrls: Array<{ url: string; row: number; threats: string[] }> = [];

    for (let i = 0; i < urlsToScan.length; i += CONCURRENCY_LIMIT) {
      const batch = urlsToScan.slice(i, i + CONCURRENCY_LIMIT);
      const scanPromises = batch.map(async ({ url, row }) => {
        try {
          const result = await validateUrlSafety(url);
          if (!result.isValid) {
            return { url, row, threats: result.threats || [] };
          }
          return null;
        } catch (error) {
          console.warn(`Failed to scan URL ${url} at row ${row}:`, error);
          // On scan failure, allow URL (graceful fallback)
          return null;
        }
      });

      const batchResults = await Promise.all(scanPromises);
      const batchUnsafeUrls = batchResults.filter(Boolean) as Array<{ url: string; row: number; threats: string[] }>;
      unsafeUrls.push(...batchUnsafeUrls);
    }

    // If unsafe URLs found, return them as validation errors
    if (unsafeUrls.length > 0) {
      const safetyErrors = unsafeUrls.map(({ row, threats }) => ({
        row,
        errors: [{
          message: `Unsafe URL detected - contains ${threats.map(t => {
            switch (t) {
              case "MALWARE": return "malware";
              case "SOCIAL_ENGINEERING": return "phishing";
              case "UNWANTED_SOFTWARE": return "unwanted software";
              case "POTENTIALLY_HARMFUL_APPLICATION": return "potentially harmful application";
              default: return "security threat";
            }
          }).join(", ")}`,
          path: ["url"],
        }],
      }));

      return jsonWithETag(
        req,
        {
          message: "Unsafe URLs detected in CSV import",
          errors: safetyErrors,
          unsafeUrlsCount: unsafeUrls.length,
        },
        { status: 400 },
      );
    }

    // Memory optimization: clear large arrays we no longer need after processing
    const originalUrlsToScan = [...urlsToScan]; // Keep copy for safety checks
    urlsToScan.length = 0; // Clear the array to free memory

    console.log(`All ${originalUrlsToScan.length} URLs passed safety checks`);

    // Optimized batch processing: create links individually to get IDs, process tags efficiently
    // Dynamically adjust batch size based on total records for optimal performance
    const TOTAL_RECORDS = linksToCreate.length;
    const BATCH_SIZE = TOTAL_RECORDS > 1000 ? 25 : TOTAL_RECORDS > 500 ? 50 : 100;

    // Add progress tracking for large imports
    const shouldTrackProgress = TOTAL_RECORDS > 100;
    let processedCount = 0;

    if (shouldTrackProgress) {
      console.log(`Starting batch import of ${TOTAL_RECORDS} links (batch size: ${BATCH_SIZE})`);
    }
    let totalCreatedCount = 0;
    const createdSlugs: string[] = [];
    const slugToId = new Map<string, string>();
    const tagNameToId = new Map<string, string>();

    // Pre-create all tags in one batch to avoid repeated queries
    const allTagNames = Array.from(
      new Set(tagsToCreate.flatMap((t) => t.tagNames)),
    );

    if (allTagNames.length > 0) {
      // Use individual upserts for better control and to ensure all tags exist
      // This is more reliable than createMany + skipDuplicates for concurrent operations
      await db.$transaction(async (tx) => {
        for (const tagName of allTagNames) {
          const existing = await tx.tag.upsert({
            where: {
              name_workspaceId: {
                name: tagName,
                workspaceId: workspaceCheck.workspace.id,
              },
            },
            update: {}, // No updates needed, just ensure it exists
            create: {
              name: tagName,
              workspaceId: workspaceCheck.workspace.id,
            },
            select: { id: true, name: true },
          });
          tagNameToId.set(existing.name, existing.id);
        }
      });
    }

    // Process links in batches
    for (let i = 0; i < linksToCreate.length; i += BATCH_SIZE) {
      const batch = linksToCreate.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(linksToCreate.length / BATCH_SIZE);

      if (shouldTrackProgress) {
        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} links)`);
      }

      await db.$transaction(async (tx) => {
        const batchResults: Array<{ id: string; slug: string }> = [];

        // Create links individually to get their IDs (more efficient than createMany + findMany)
        for (const linkData of batch) {
          try {
            const created = await tx.link.create({
              data: linkData,
              select: { id: true, slug: true },
            });
            batchResults.push(created);
            slugToId.set(created.slug, created.id);
            createdSlugs.push(created.slug);
          } catch (error) {
            // Skip duplicates (slug already exists)
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') continue;
            throw error;
          }
        }

        // Create link-tag associations for this batch
        const batchLinkTags: Array<{ linkId: string; tagId: string }> = [];
        const processedPairs = new Set<string>();

        tagsToCreate
          .filter((tagData) => batchResults.some((link) => link.slug === tagData.linkSlug))
          .forEach(({ linkSlug, tagNames }) => {
            const linkId = slugToId.get(linkSlug);
            if (!linkId) return;

            tagNames.forEach((name) => {
              const tagId = tagNameToId.get(name);
              if (!tagId) return;

              const key = `${linkId}:${tagId}`;
              if (!processedPairs.has(key)) {
                processedPairs.add(key);
                batchLinkTags.push({ linkId, tagId });
              }
            });
          });

        if (batchLinkTags.length > 0) {
          await tx.linkTag.createMany({
            data: batchLinkTags,
            skipDuplicates: true,
          });
        }

        totalCreatedCount += batchResults.length;
        processedCount += batch.length;

        if (shouldTrackProgress && batchNumber % 5 === 0) {
          const progress = ((processedCount / TOTAL_RECORDS) * 100).toFixed(1);
          console.log(`Progress: ${progress}% (${processedCount}/${TOTAL_RECORDS} processed, ${totalCreatedCount} created)`);
        }
      });
    }

    if (shouldTrackProgress) {
      console.log(`Import completed: ${totalCreatedCount} links created from ${TOTAL_RECORDS} records`);
    }

    // Update usage counters once at the end
    if (totalCreatedCount > 0) {
      await db.$transaction(async (tx) => {
        await Promise.all([
          tx.workspace.update({
            where: { id: workspaceCheck.workspace.id },
            data: { linksUsage: { increment: totalCreatedCount } },
          }),
          tx.usage.updateMany({
            where: {
              workspaceId: workspaceCheck.workspace.id,
              userId: session.user.id,
            },
            data: { linksCreated: { increment: totalCreatedCount } },
          }),
        ]);
      });
    }

    // Invalidate cache for all created links
    await invalidateLinkCacheBatch(createdSlugs);

    // Send link metadata to Tinybird (non-blocking) - use cached data instead of DB query
    createdSlugs.forEach((slug) => {
      const linkId = slugToId.get(slug);
      if (!linkId) return;

      const originalLink = linksToCreate.find((l) => l.slug === slug);
      if (!originalLink) return;

      const linkTags = tagsToCreate.find((t) => t.linkSlug === slug)?.tagNames || [];
      const tagIds = linkTags
        .map((name) => tagNameToId.get(name))
        .filter(Boolean) as string[];

      const linkMetadata = {
        link_id: linkId,
        domain: "slugy.co",
        slug: slug,
        url: originalLink.url,
        tag_ids: tagIds,
        workspace_id: workspaceCheck.workspace!.id,
        created_at: originalLink.createdAt.toISOString(),
      };
      waitUntil(sendLinkMetadata(linkMetadata));
    });

    // Memory cleanup: clear large data structures we no longer need
    linksToCreate.length = 0;
    tagsToCreate.length = 0;
    slugToId.clear();
    tagNameToId.clear();
    createdSlugs.length = 0;

    return jsonWithETag(
      req,
      {
        message: `Successfully imported ${totalCreatedCount} links`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error importing CSV:", error);
    if (error instanceof Error) {
      return jsonWithETag(req, { message: error.message }, { status: 400 });
    }
    return jsonWithETag(
      req,
      { message: "An error occurred while importing CSV." },
      { status: 500 },
    );
  }
}
