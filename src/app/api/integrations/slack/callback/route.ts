import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { encryptSecret } from "@/lib/integrations/encrypt";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";
import { requireIntegrationsAccess } from "@/lib/integrations/workspace";

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  team?: { id?: string };
  incoming_webhook?: { channel_id?: string };
}

/**
 * Slack OAuth callback. Completes only for the logged-in manager who started
 * the install (state-bound) and who still manages the workspace — an attacker
 * can no longer link their Slack to someone else's workspace.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? "";
  if (!code || !state) {
    return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
  }
  const workspaceSlug = verifyOAuthState(state, session.user.id);
  if (!workspaceSlug) {
    return NextResponse.json(
      { error: "Invalid or expired OAuth state" },
      { status: 403 },
    );
  }
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Slack not configured" },
      { status: 500 },
    );
  }

  const workspace = await requireIntegrationsAccess(
    workspaceSlug,
    session.user.id,
  );
  if (!workspace) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const redirectUri = `${process.env.NEXT_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/integrations/slack/callback`;
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });
  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok || !data.access_token) {
    return NextResponse.json(
      { error: data.error ?? "oauth_failed" },
      { status: 400 },
    );
  }

  await db.integration.upsert({
    where: {
      workspaceId_provider: { workspaceId: workspace.id, provider: "slack" },
    },
    create: {
      workspaceId: workspace.id,
      provider: "slack",
      status: "connected",
      config: {
        botToken: encryptSecret(data.access_token),
        teamId: data.team?.id ?? null,
        channelId: data.incoming_webhook?.channel_id ?? null,
        leadEvents: true,
        saleEvents: true,
      },
      createdBy: session.user.id,
    },
    update: {
      status: "connected",
      config: {
        botToken: encryptSecret(data.access_token),
        teamId: data.team?.id ?? null,
        channelId: data.incoming_webhook?.channel_id ?? null,
        leadEvents: true,
        saleEvents: true,
      },
    },
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_APP_URL ?? "";
  return NextResponse.redirect(
    `${appUrl}/${workspace.slug}/settings/integrations?connected=slack`,
  );
}
