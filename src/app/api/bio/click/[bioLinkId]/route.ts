import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { addUTMParams } from "@/utils/bio-links";

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
    return NextResponse.redirect(shortUrl, 302);
  }

  const destination = (() => {
    try {
      return addUTMParams(bioLink.url);
    } catch {
      return bioLink.url;
    }
  })();

  // Fire-and-forget counters; never block the redirect on DB errors.
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

    if (bioLink.linkId) {
      try {
        const linked = await db.link.findUnique({
          where: { id: bioLink.linkId },
          select: { id: true, workspaceId: true },
        });
        if (linked) {
          await Promise.allSettled([
            db.link.update({
              where: { id: linked.id },
              data: { clicks: { increment: 1 }, lastClicked: new Date() },
            }),
            db.analytics.create({
              data: {
                linkId: linked.id,
                trigger: "bio",
                referer: "bio",
              },
            }),
          ]);
          const usage = await db.usage.findFirst({
            where: { workspaceId: linked.workspaceId },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          });
          if (usage) {
            await db.usage
              .update({
                where: { id: usage.id },
                data: { clicksTracked: { increment: 1 } },
              })
              .catch(() => undefined);
          }
        }
      } catch {
        // ignore
      }
    }
  })();

  // Best-effort: wait briefly so self-hosted / serverless without
  // waitUntil doesn't drop the increment, but don't delay UX.
  await Promise.race([track, new Promise((r) => setTimeout(r, 400))]);

  return NextResponse.redirect(destination, 302);
}
