import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifySlackSignature } from "@/lib/integrations/slack";
import { validateLinkSlug } from "@/lib/link-slug";
import { createLinkWithQuota } from "@/lib/usage/quota";
import { checkLinkLimit } from "@/lib/subscription/limit-queries";

/**
 * Slack `/shorten <url> [custom-slug]` — verifies signing secret, resolves the
 * workspace via the registered channel, creates a link with quota enforcement.
 */
export async function POST(req: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json(
      { error: "Slack not configured" },
      { status: 500 },
    );
  }
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";
  if (
    !verifySlackSignature({
      signingSecret,
      timestamp,
      body: rawBody,
      signature,
    })
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
  }

  const form = new URLSearchParams(rawBody);
  const text = (form.get("text") ?? "").trim();
  const teamId = form.get("team_id") ?? "";
  const [url, customSlugRaw] = text.split(/\s+/);

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Usage: /shorten <https-url> [custom-slug]",
    });
  }

  // Strict team scoping: a command is honored only by the Slugy workspace
  // whose stored Slack team matches the caller's team. Never fall back to
  // another workspace — that would bill links (and leak URLs) cross-tenant.
  if (!teamId) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Could not identify your Slack team. Reconnect the integration.",
    });
  }
  const integrations = await db.integration.findMany({
    where: { provider: "slack", status: "connected" },
    select: { workspaceId: true, config: true },
  });
  const match = integrations.find((i) => {
    const cfg = (i.config ?? {}) as { teamId?: string };
    return cfg.teamId === teamId;
  });
  if (!match) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "No connected Slugy workspace for this Slack team. An owner can reconnect in Settings → Integrations.",
    });
  }

  const workspace = await db.workspace.findUnique({
    where: { id: match.workspaceId },
    select: { id: true, userId: true },
  });
  if (!workspace) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Workspace not found.",
    });
  }

  const customSlug = customSlugRaw?.trim() || null;
  if (customSlug) {
    const check = validateLinkSlug(customSlug);
    if (!check.ok) {
      return NextResponse.json({
        response_type: "ephemeral",
        text: check.message,
      });
    }
  }

  const limit = await checkLinkLimit(workspace.userId, workspace.id);
  if (!limit.canCreate) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: limit.message || "Link limit reached. Upgrade to Pro.",
    });
  }

  try {
    const created = await createLinkWithQuota(
      {
        workspaceId: workspace.id,
        ownerUserId: workspace.userId,
        maxLinks: limit.maxLimit,
        customSlug,
      },
      async (tx, slug) =>
        tx.link.create({
          data: {
            workspaceId: workspace.id,
            userId: workspace.userId,
            url,
            slug,
            domain: "slugy.co",
          },
          select: { slug: true, domain: true },
        }),
    );
    return NextResponse.json({
      response_type: "in_channel",
      text: `Shortened: https://${created.domain}/${created.slug} → ${url}`,
    });
  } catch {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Slug taken or generation failed — try another custom slug.",
    });
  }
}
