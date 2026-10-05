import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireWorkspaceManager } from "@/lib/integrations/workspace";
import { createOAuthState } from "@/lib/integrations/oauth-state";

/** Start Slack OAuth. State is HMAC-bound to the initiating manager + expiry. */
export async function GET(req: Request) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Slack not configured" },
      { status: 500 },
    );
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const workspace = searchParams.get("workspace") ?? "";
  if (!workspace) {
    return NextResponse.json({ error: "Missing workspace" }, { status: 400 });
  }
  const managed = await requireWorkspaceManager(workspace, session.user.id);
  if (!managed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const redirectUri = `${process.env.NEXT_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/integrations/slack/callback`;
  const scopes = ["chat:write", "commands", "incoming-webhook"].join(",");
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set(
    "state",
    createOAuthState(managed.slug, session.user.id),
  );
  return NextResponse.redirect(url.toString());
}
