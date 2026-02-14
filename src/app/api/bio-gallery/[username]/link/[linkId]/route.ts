import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache-invalidator";
import { invalidateBioByUsernameAndUser } from "@/lib/cache-utils/bio-cache";
import { validateUrlSafety } from "@/server/actions/url-scan";
import { z } from "zod";

const updateLinkSchema = z.object({
  title: z.string().min(1).max(100),
  url: z.string().url(),
  style: z.enum(["link", "feature", "feature-grid-2"]).optional(),
});

//* Update link
export async function PUT(
  req: Request,
  context: { params: Promise<{ username: string; linkId: string }> },
) {
  const params = await context.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gallery = await db.bio.findFirst({
    where: {
      userId: session.user.id,
      username: params.username,
    },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const link = await db.bioLinks.findFirst({
    where: {
      id: params.linkId,
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const body = (await req.json()) as unknown;
  const parsedBody = updateLinkSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid input", errors: parsedBody.error.errors },
      { status: 400 },
    );
  }

  const { title, url, style } = parsedBody.data;

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
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

  await db.bioLinks.update({
    where: { id: params.linkId },
    data: { title, url, style: style ?? "link" },
  });

  // Invalidate both caches: public gallery + admin dashboard
  await Promise.all([
    invalidateBioCache.links(params.username), // Public cache
    invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
  ]);

  return NextResponse.json({ message: "Link updated successfully" });
}

//* Delete link
export async function DELETE(
  req: Request,
  context: { params: Promise<{ username: string; linkId: string }> },
) {
  const params = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gallery = await db.bio.findFirst({
    where: {
      userId: session.user.id,
      username: params.username,
    },
  });

  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const linkId = params.linkId;

  await db.bioLinks.delete({
    where: {
      id: linkId,
    },
  });

  // Invalidate both caches: public gallery + admin dashboard
  await Promise.all([
    invalidateBioCache.links(params.username), // Public cache
    invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
  ]);

  return NextResponse.json({
    message: "Link deleted successfully",
  });
}

// * update isPublic status
export async function PATCH(
  req: Request,
  context: { params: Promise<{ username: string; linkId: string }> },
) {
  const params = await context.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { isPublic } = (await req.json()) as { isPublic: boolean };

  await db.bioLinks.update({
    where: { id: params.linkId },
    data: { isPublic },
  });

  // Invalidate both caches: public gallery + admin dashboard
  await Promise.all([
    invalidateBioCache.links(params.username), // Public cache
    invalidateBioByUsernameAndUser(params.username, session.user.id), // Admin cache
  ]);

  return NextResponse.json({ message: "Link updated successfully" });
}
