import { NextResponse, type NextRequest } from "next/server";
import { auth, isUserBanned } from "@/lib/auth";
import { db } from "@/server/db";
import {
  apiKeyHint,
  generateApiKey,
  hashApiKey,
} from "@/lib/api-keys/generate";

export const dynamic = "force-dynamic";

const EXTENSION_KEY_NAME = "Slugy Browser Extension";

const getAppBaseUrl = () =>
  process.env.NEXT_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_BASE_URL ||
  "http://localhost:3000";

/**
 * Sends the browser tab to the extension handshake page with the result in the
 * URL fragment. The target is fixed (never caller-controlled), so this endpoint
 * cannot be used as an open redirector. A content script on the app origin
 * reads the fragment, forwards it to the extension, and closes the tab.
 */
function authorizeRedirect(params: Record<string, string>): NextResponse {
  const url = new URL("/extension/authorize", getAppBaseUrl());
  url.hash = new URLSearchParams(params).toString();
  const response = NextResponse.redirect(url.toString(), 302);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

async function resolveWorkspaces(userId: string) {
  // Match the dashboard switcher: owned + member workspaces. Members can
  // already create links via the UI, so minting a scoped links:write
  // extension key for them is equivalent privilege, not an escalation.
  return db.workspace.findMany({
    where: {
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, slug: true },
  });
}

async function getOrCreateExtensionToken(
  workspaceId: string,
  userId: string,
): Promise<string> {
  // Secrets are stored hashed and can't be re-read, so hashed rows ROTATE on
  // connect: revoke live rows for this name, mint fresh, return raw once.
  // Legacy plaintext rows (pre-hash migration) are returned as-is until the
  // backfill hashes them — no silent logout for connected extensions.
  const live = await db.workspaceApiKey.findMany({
    where: {
      workspaceId,
      name: EXTENSION_KEY_NAME,
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true, key: true, keyHash: true },
  });
  const reusable = live.find(
    (row) => !row.keyHash && row.key.startsWith("slugy_"),
  );
  if (reusable) return reusable.key;

  if (live.length > 0) {
    await db.workspaceApiKey.updateMany({
      where: { id: { in: live.map((row) => row.id) } },
      data: { deletedAt: new Date() },
    });
  }

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  await db.workspaceApiKey.create({
    data: {
      name: EXTENSION_KEY_NAME,
      // Phase-out: raw column holds the non-secret hash until dropped.
      key: keyHash,
      keyHash,
      keyHint: apiKeyHint(rawKey),
      workspaceId,
      createdBy: userId,
      permissionLevel: "restricted",
      linksPermission: "write",
      leadsPermission: "none",
    },
    select: { id: true },
  });

  return rawKey;
}

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (!state || !/^[a-zA-Z0-9-]{16,128}$/.test(state)) {
    return NextResponse.json(
      { error: "A valid extension connection state is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const withState = (params: Record<string, string>) => ({
    ...params,
    ...(state ? { state } : {}),
  });

  if (error) {
    return authorizeRedirect(withState({ error: "auth_failed" }));
  }

  const session = await auth.api.getSession({ headers: req.headers });

  // Banned accounts must not mint extension tokens (this route bypasses
  // getAuthSession(), which is where bans are otherwise enforced).
  if (
    session?.user?.id &&
    (await isUserBanned(session.user.id, session.user))
  ) {
    return authorizeRedirect(withState({ error: "account_suspended" }));
  }

  // Not signed in: start the provider login (or send to the login page, which
  // resumes this route afterwards via ?next=).
  if (!session?.user?.id) {
    if (provider === "google" || provider === "github") {
      try {
        const result = await auth.api.signInSocial({
          body: {
            provider,
            callbackURL: req.nextUrl.toString(),
            errorCallbackURL: req.nextUrl.toString(),
          },
          headers: req.headers,
        });

        if (result?.url) {
          return NextResponse.redirect(result.url, 302);
        }
      } catch (signInError) {
        console.error("Extension social sign-in failed:", signInError);
      }

      return authorizeRedirect(withState({ error: "auth_failed" }));
    }

    const loginUrl = new URL("/login", getAppBaseUrl());
    loginUrl.searchParams.set(
      "next",
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl.toString(), 302);
  }

  const workspaces = await resolveWorkspaces(session.user.id);
  if (!workspaces.length) {
    return authorizeRedirect(withState({ error: "no_workspace" }));
  }

  const connections = [];
  for (const workspace of workspaces) {
    connections.push({
      workspace: workspace.slug,
      workspaceName: workspace.name,
      token: await getOrCreateExtensionToken(workspace.id, session.user.id),
    });
  }
  const primary = connections[0]!;

  return authorizeRedirect(
    withState({
      token: primary.token,
      workspace: primary.workspace,
      workspace_name: primary.workspaceName,
      workspaces: JSON.stringify(connections),
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      image: session.user.image ?? "",
    }),
  );
}
