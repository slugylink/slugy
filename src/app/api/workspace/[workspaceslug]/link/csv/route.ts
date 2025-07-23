import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { parse as csvParse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { headers } from "next/headers";
import { checkWorkspaceAccessAndLimits } from "@/server/actions/limit";
import { invalidateLinkCacheBatch } from "@/lib/cache-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { message: "Workspace not found" },
        { status: 404 },
      );
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      return NextResponse.json(
        { message: "Invalid file type. Please upload a CSV file." },
        { status: 400 },
      );
    }

    // Read and parse CSV
    const csvText = await file.text();
    const records = csvParse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return NextResponse.json(
        { message: "CSV file is empty or has no valid data" },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          message: "Validation errors found in CSV",
          errors,
        },
        { status: 400 },
      );
    }

    // Create links in database
    let createdLinksCount = 0;
    await db.$transaction(async (tx) => {
      const createdLinks = await tx.link.createMany({
        data: linksToCreate,
        skipDuplicates: true, // Skip if slug already exists
      });
      createdLinksCount = createdLinks.count;
      // Update usage counters
      await Promise.all([
        tx.workspace.update({
          where: { id: workspaceCheck.workspace.id },
          data: { linksUsage: { increment: createdLinks.count } },
        }),
        tx.usage.updateMany({
          where: {
            workspaceId: workspaceCheck.workspace.id,
            userId: session.user.id,
          },
          data: { linksCreated: { increment: createdLinks.count } },
        }),
      ]);
    });

    // Invalidate cache for all created links
    const slugs = linksToCreate.map(link => link.slug);
    await invalidateLinkCacheBatch(slugs);

    return NextResponse.json(
      {
        message: `Successfully imported ${createdLinksCount} links`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error importing CSV:", error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "An error occurred while importing CSV." },
      { status: 500 },
    );
  }
}
