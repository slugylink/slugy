import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { generateApiKey } from "@/lib/api-keys/generate";

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
  return NextResponse.redirect(url.toString(), 302);
}

async function resolveWorkspace(userId: string) {
  return db.workspace.findFirst({
    where: { userId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, slug: true },
  });
}

async function getOrCreateExtensionToken(
  workspaceId: string,
  userId: string,
): Promise<string> {
  const existing = await db.workspaceApiKey.findFirst({
    where: {
      workspaceId,
      name: EXTENSION_KEY_NAME,
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { key: true },
  });

  if (existing) return existing.key;

  const created = await db.workspaceApiKey.create({
    data: {
      name: EXTENSION_KEY_NAME,
      key: generateApiKey(),
      workspaceId,
      createdBy: userId,
      permissionLevel: "restricted",
      linksPermission: "write",
      leadsPermission: "none",
    },
    select: { key: true },
  });

  return created.key;
}

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const withState = (params: Record<string, string>) => ({
    ...params,
    ...(state ? { state } : {}),
  });

  if (error) {
    return authorizeRedirect(withState({ error: "auth_failed" }));
  }

  const session = await auth.api.getSession({ headers: req.headers });

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

  const workspace = await resolveWorkspace(session.user.id);
  if (!workspace) {
    return authorizeRedirect(withState({ error: "no_workspace" }));
  }

  const token = await getOrCreateExtensionToken(workspace.id, session.user.id);

  return authorizeRedirect(
    withState({
      token,
      workspace: workspace.slug,
      workspace_name: workspace.name,
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      image: session.user.image ?? "",
    }),
  );
}
