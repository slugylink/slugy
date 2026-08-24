import { db } from "@/server/db";
import type { ResourcePermission, WorkspaceApiKey } from "@prisma/client";

export type ApiKeyAuthSuccess = {
  ok: true;
  apiKey: WorkspaceApiKey;
  workspaceId: string;
};

export type ApiKeyAuthFailure = {
  ok: false;
  status: number;
  message: string;
};

export type ApiKeyAuthResult = ApiKeyAuthSuccess | ApiKeyAuthFailure;

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export async function authenticateWorkspaceApiKey(
  req: Request,
  required: {
    conversions?: ResourcePermission;
  } = {},
): Promise<ApiKeyAuthResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      message: "Missing Authorization Bearer token",
    };
  }

  const apiKey = await db.workspaceApiKey.findFirst({
    where: {
      key: token,
      deletedAt: null,
    },
  });

  if (!apiKey) {
    return { ok: false, status: 401, message: "Invalid API key" };
  }

  if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 401, message: "API key expired" };
  }

  if (required.conversions) {
    const allowed =
      apiKey.permissionLevel === "all" ||
      hasPermission(apiKey.conversionsPermission, required.conversions);
    if (!allowed) {
      return {
        ok: false,
        status: 403,
        message: "API key lacks conversions write permission",
      };
    }
  }

  // Fire-and-forget lastUsed update
  void db.workspaceApiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    })
    .catch(() => undefined);

  return {
    ok: true,
    apiKey,
    workspaceId: apiKey.workspaceId,
  };
}

function hasPermission(
  actual: ResourcePermission,
  required: ResourcePermission,
): boolean {
  if (required === "none") return true;
  if (required === "read") return actual === "read" || actual === "write";
  if (required === "write") return actual === "write";
  return false;
}
