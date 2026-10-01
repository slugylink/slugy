import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { db } from "@/server/db";
import { addUTMParams } from "@/utils/bio-links";
import { detectTrigger } from "@/lib/middleware/detect-trigger";

/**
 * Tracked redirect for bio buttons (legacy / fallback path).
 * GET /api/bio/click/:bioLinkId -> 302.
 * - Linked rows redirect to the workspace SHORT link (with ?bio= for
 *   attribution), so hover/status shows slugy.co/xxxx and counting happens
 *   once in the short-link pipeline (Link + Analytics + Bio counters).
 * - Unlinked rows redirect straight to the destination with direct counters.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ bioLinkId: string }> },
) {
  const { bioLinkId } = await context.params;

  const bioLink = await db.bioLinks.findUnique({
    where: { id: bioLinkId },
    select: {
      id: true,
      bioId: true,
      url: true,
      linkId: true,
      isPublic: true,
      deletedAt: true,
      link: { select: { slug: true, domain: true } },
    },
  });

  if (!bioLink || bioLink.deletedAt) {
    return NextResponse.json({ error: "Bio link not found" }, { status: 404 });
  }

  // Linked rows: bounce through the short link so the user sees
  // slugy.co/xxxx and all counters stay in the redirect pipeline.
  if (bioLink.linkId && bioLink.link) {
    const params = new URLSearchParams({ bio: bioLink.id, ref: "slugy.co" });
    const shortUrl = `https://${bioLink.link.domain}/${bioLink.link.slug}?${params.toString()}`;
    const redirect = NextResponse.redirect(shortUrl, 302);
    redirect.headers.set("Cache-Control", "private, no-store, max-age=0");
    return redirect;
  }

  const destination = (() => {
    try {
      return addUTMParams(bioLink.url);
    } catch {
      return bioLink.url;
    }
  })();

  // Unlinked legacy rows have no workspace short link, so there is no
  // Tinybird event (link_id is required) and no quota to enforce — Prisma
  // bio/bioLinks counters are their only source. Crawlers and prefetches
  // must not inflate them.
  const trigger = detectTrigger(_req, destination);
  if (trigger === "bot" || trigger === "prefetch") {
    const redirect = NextResponse.redirect(destination, 302);
    redirect.headers.set("Cache-Control", "private, no-store, max-age=0");
    return redirect;
  }

  // Fire-and-forget counters; never block the redirect on DB errors.
  // waitUntil keeps them alive on Vercel; no await here so the 302
  // returns immediately (previously awaited up to 400ms).
  const track = (async () => {
    try {
      await db.bioLinks.update({
        where: { id: bioLink.id },
        data: { clicks: { increment: 1 } },
      });
    } catch {
      // ignore
    }
    try {
      await db.bio.update({
        where: { id: bioLink.bioId },
        data: { clicksUsage: { increment: 1 } },
      });
    } catch {
      // ignore
    }
  })();
  waitUntil(track);

  const redirect = NextResponse.redirect(destination, 302);
  redirect.headers.set("Cache-Control", "private, no-store, max-age=0");
  return redirect;
}
