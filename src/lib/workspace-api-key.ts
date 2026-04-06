import { type WorkspaceApiKey } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/server/db";

type WorkspaceApiKeyWithWorkspace = Pick<
  WorkspaceApiKey,
  | "id"
  | "key"
  | "name"
  | "workspaceId"
  | "permissionLevel"
  | "linksPermission"
  | "expiresAt"
> & {
  workspace: {
    id: string;
    slug: string;
  };
};

function extractApiKey(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");

  if (xApiKey?.trim()) {
    return xApiKey.trim();
  }

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

function canWriteLinks(apiKey: WorkspaceApiKeyWithWorkspace): boolean {
  if (apiKey.permissionLevel === "all") {
    return true;
  }

  return apiKey.linksPermission === "write";
}

export async function authenticateWorkspaceApiKey(req: NextRequest): Promise<
  | {
      ok: true;
      apiKey: WorkspaceApiKeyWithWorkspace;
    }
  | {
      ok: false;
      reason: "missing" | "invalid" | "expired" | "insufficient_permissions";
    }
> {
  const key = extractApiKey(req);

  if (!key) {
    return { ok: false, reason: "missing" };
  }

  const apiKey = await db.workspaceApiKey.findUnique({
    where: { key },
    select: {
      id: true,
      key: true,
      name: true,
      workspaceId: true,
      permissionLevel: true,
      linksPermission: true,
      expiresAt: true,
      workspace: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!apiKey) {
    return { ok: false, reason: "invalid" };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }

  if (!canWriteLinks(apiKey)) {
    return { ok: false, reason: "insufficient_permissions" };
  }

  void db.workspaceApiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    })
    .catch((error) => {
      console.error("[Workspace API Key] Failed to update lastUsed:", error);
    });

  return { ok: true, apiKey };
}
