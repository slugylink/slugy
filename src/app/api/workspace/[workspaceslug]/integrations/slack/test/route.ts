import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { decryptSecret } from "@/lib/integrations/encrypt";
import { postSlackMessage } from "@/lib/integrations/slack";
import { requireWorkspaceManager } from "@/lib/integrations/workspace";

/**
 * Post a test message through the connected Slack integration, bypassing the
 * Inngest pipeline. Returns the raw Slack result so failures (e.g.
 * channel_not_found, not_in_channel, token_revoked) are visible instead of
 * swallowed by fire-and-forget delivery.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug } = await params;
  const workspace = await requireWorkspaceManager(
    workspaceslug,
    session.user.id,
  );
  if (!workspace)
    return jsonWithETag(req, { error: "Forbidden" }, { status: 403 });

  const integration = await db.integration.findUnique({
    where: {
      workspaceId_provider: { workspaceId: workspace.id, provider: "slack" },
    },
    select: { status: true, config: true },
  });
  if (!integration || integration.status !== "connected") {
    return jsonWithETag(req, { error: "Slack not connected" }, { status: 404 });
  }

  const cfg = (integration.config ?? {}) as {
    botToken?: string;
    channelId?: string;
  };
  if (!cfg.botToken || !cfg.channelId) {
    return jsonWithETag(
      req,
      { error: "Slack channel not set — reconnect and pick a channel" },
      { status: 422 },
    );
  }

  try {
    await postSlackMessage({
      botToken: decryptSecret(cfg.botToken),
      channel: cfg.channelId,
      text: "🔔 Slugy test notification — your Slack integration is working.",
    });
    return jsonWithETag(req, { ok: true, channel: cfg.channelId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "slack_post_failed";
    return jsonWithETag(req, { error: message }, { status: 502 });
  }
}
