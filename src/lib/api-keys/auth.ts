import { db } from "@/server/db";
import type { ResourcePermission, WorkspaceApiKey } from "@prisma/client";

export type ApiKeyAuthResult =
  | { ok: true; apiKey: WorkspaceApiKey }
  | { ok: false; status: 401 | 403; message: string };

function parseBearerToken(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function authenticateApiKey(
  authorizationHeader: string | null,
  requiredPermission: ResourcePermission = "write",
): Promise<ApiKeyAuthResult> {
  const token = parseBearerToken(authorizationHeader);
  if (!token) {
    return { ok: false, status: 401, message: "Missing Bearer API key" };
  }

  const apiKey = await db.workspaceApiKey.findFirst({
    where: {
      key: token,
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!apiKey) {
    return { ok: false, status: 401, message: "Invalid API key" };
  }

  const permission = apiKey.leadsPermission;
  if (requiredPermission === "write" && permission !== "write") {
    return {
      ok: false,
      status: 403,
      message: "API key lacks leads write permission",
    };
  }

  if (
    requiredPermission === "read" &&
    permission !== "read" &&
    permission !== "write"
  ) {
    return {
      ok: false,
      status: 403,
      message: "API key lacks leads read permission",
    };
  }

  void db.workspaceApiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    })
    .catch(() => undefined);

  return { ok: true, apiKey };
}
