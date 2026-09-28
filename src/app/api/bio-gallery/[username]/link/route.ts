import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod"; // Import zod for input validation
import { checkBioGalleryLinkLimit } from "@/server/actions/limit";
import { headers } from "next/headers";
import { validateUrlSafety } from "@/server/actions/url-scan";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";
import { createTrackedLinkForBio } from "@/lib/bio-link-bridge";

// Updated input validation schema
const createLinkSchema = z
  .object({
    title: z.string().max(100),
    url: z.string().url().optional(),
    style: z.enum(["link", "feature", "feature-grid-2"]).optional(),
    image: z.string().url().nullable().optional(),
    // Attach an existing workspace short link instead of auto-creating one.
    linkId: z.string().min(1).max(64).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.linkId && !data.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either url or linkId is required",
        path: ["url"],
      });
    }
  });

// * add/create link to bio gallery [useranme]:
export async function POST(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  const params = await context.params;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as unknown;
    const parseResult = createLinkSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", errors: parseResult.error.errors },
        { status: 400 },
      );
    }

    const { title, url, style, image, linkId } = parseResult.data;

    const gallery = await db.bio.findFirst({
      where: {
        userId: session.user.id,
        username: params.username,
      },
      include: {
        _count: {
          select: {
            links: true,
          },
        },
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: "Bio gallery not found" },
        { status: 404 },
      );
    }

    // Check gallery link limit
    const limitResult = await checkBioGalleryLinkLimit(
      session.user.id,
      gallery.id,
    );
    if (!limitResult.canCreate) {
      return NextResponse.json(
        {
          error:
            "You have reached the maximum number of links for this bio gallery.",
          code: "limit_exceeded",
          limitInfo: {
            currentLinks: limitResult.currentCount,
            maxLinks: limitResult.maxLimit,
            planType: limitResult.planType,
          },
        },
        { status: 403 },
      );
    }

    // Attach flow: reuse an existing workspace short link (workspace owns it).
    if (linkId) {
      const workspaceLink = await db.link.findFirst({
        where: {
          id: linkId,
          deletedAt: null,
          isArchived: false,
          OR: [
            { userId: session.user.id },
            {
              workspace: {
                OR: [
                  { userId: session.user.id },
                  { members: { some: { userId: session.user.id } } },
                ],
              },
            },
          ],
        },
        select: {
          id: true,
          url: true,
          title: true,
          slug: true,
          domain: true,
          image: true,
        },
      });

      if (!workspaceLink) {
        return NextResponse.json(
          { error: "Workspace link not found or access denied" },
          { status: 404 },
        );
      }

      const alreadyAttached = await db.bioLinks.findUnique({
        where: { linkId: workspaceLink.id },
        select: { id: true, bioId: true },
      });
      if (alreadyAttached) {
        return NextResponse.json(
          {
            error:
              alreadyAttached.bioId === gallery.id
                ? "This short link is already added to this bio page."
                : "This short link is already used in another bio page.",
            code: "already_attached",
          },
          { status: 409 },
        );
      }

      const attached = await db.bioLinks.create({
        data: {
          title: title || workspaceLink.title || workspaceLink.url,
          url: workspaceLink.url,
          style: style ?? "link",
          image: image ?? workspaceLink.image,
          bioId: gallery.id,
          position: 0,
          linkId: workspaceLink.id,
          linkManagedByBio: false,
        },
      });

      await Promise.all([
        invalidateBioCache.links(params.username),
        invalidateBioByUsernameAndUser(params.username, session.user.id),
      ]);

      return NextResponse.json(attached);
    }

    // New-URL flow: url is guaranteed by schema when linkId is absent.
    if (!url) {
      return NextResponse.json(
        { error: "Invalid input", errors: [{ message: "url is required" }] },
        { status: 400 },
      );
    }

    // Check URL safety
    try {
      const safetyResult = await validateUrlSafety(url);
      if (!safetyResult.isValid) {
        const threats = safetyResult.threats || [];
        return NextResponse.json(
          {
            error: `Unsafe URL detected - contains ${threats
              .map((t) => {
                switch (t) {
                  case "MALWARE":
                    return "malware";
                  case "SOCIAL_ENGINEERING":
                    return "phishing";
                  case "UNWANTED_SOFTWARE":
                    return "unwanted software";
                  case "POTENTIALLY_HARMFUL_APPLICATION":
                    return "potentially harmful application";
                  default:
                    return "security threat";
                }
              })
              .join(", ")}`,
            code: "unsafe_url",
          },
          { status: 400 },
        );
      }
    } catch (error) {
      console.warn(`Failed to scan URL ${url}:`, error);
      // On scan failure, allow URL (graceful fallback)
    }

    const newLink = await db.bioLinks.create({
      data: {
        title: title,
        url: url,
        style: style ?? "link",
        image: image ?? null,
        bioId: gallery.id,
        position: 0,
      },
    });

    // Bridge: auto-create a tracked workspace Link so bio buttons reuse
    // short-link analytics / QR / custom domains. Non-blocking for UX —
    // the bio button works even when workspace quota is exhausted.
    createTrackedLinkForBio({
      userId: session.user.id,
      title,
      url,
    })
      .then(async (tracked) => {
        if (!tracked) return;
        try {
          await db.bioLinks.update({
            where: { id: newLink.id },
            data: { linkId: tracked.id, linkManagedByBio: true },
          });
          await Promise.all([
            invalidateBioCache.links(params.username),
            invalidateBioByUsernameAndUser(params.username, session.user.id),
          ]);
        } catch {
          // ignore — backfill script reconciles missing linkIds
        }
      })
      .catch(() => undefined);

    // Invalidate both caches: public gallery + admin dashboard
    await Promise.all([
      invalidateBioCache.links(params.username), // Public cache
      invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
    ]);

    return NextResponse.json(newLink);
  } catch (error) {
    console.error("Error creating link:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// * get links from gallery [username]
export async function GET(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  const params = await context.params;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gallery = await db.bio.findUnique({
      where: {
        userId: session.user.id,
        username: params.username,
      },
      include: {
        socials: {
          orderBy: { platform: "asc" },
        },
        links: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    const safeGallery = {
      ...gallery,
      socials: gallery.socials
        .filter((s) => s.platform) // remove null platforms
        .map((s) => ({
          platform: s.platform ?? "",
          url: s.url ?? "",
          isPublic: s.isPublic,
        })),
      theme: gallery.theme ?? undefined,
    };

    return NextResponse.json(safeGallery);
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery" },
      { status: 500 },
    );
  }
}
