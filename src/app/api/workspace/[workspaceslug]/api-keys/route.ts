import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { createWorkspaceApiKey } from "@/lib/conversions/ids";
import type { ApiKeyPermissionLevel, ResourcePermission } from "@prisma/client";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissionLevel: z
    .enum(["all", "read_only", "restricted"])
    .default("restricted"),
  linksPermission: z.enum(["none", "read", "write"]).default("none"),
  domainsPermission: z.enum(["none", "read", "write"]).default("none"),
  workspacesPermission: z.enum(["none", "read", "write"]).default("none"),
  conversionsPermission: z.enum(["none", "read", "write"]).default("write"),
  expiresAt: z.string().datetime().optional().nullable(),
});

function maskKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { workspaceslug } = await params;
  const access = await getWorkspaceAccess(session.user.id, workspaceslug);
  if (!access.success || !access.workspace) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  if (access.role !== "owner" && access.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const keys = await db.workspaceApiKey.findMany({
    where: {
      workspaceId: access.workspace.id,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      key: true,
      permissionLevel: true,
      linksPermission: true,
      domainsPermission: true,
      workspacesPermission: true,
      conversionsPermission: true,
      lastUsed: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return Response.json({
    keys: keys.map((k) => ({
      ...k,
      key: maskKey(k.key),
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { workspaceslug } = await params;
  const access = await getWorkspaceAccess(session.user.id, workspaceslug);
  if (!access.success || !access.workspace) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  if (access.role !== "owner" && access.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const plaintextKey = createWorkspaceApiKey();

  let permissionLevel: ApiKeyPermissionLevel = parsed.data.permissionLevel;
  let conversionsPermission: ResourcePermission =
    parsed.data.conversionsPermission;
  let linksPermission: ResourcePermission = parsed.data.linksPermission;
  let domainsPermission: ResourcePermission = parsed.data.domainsPermission;
  let workspacesPermission: ResourcePermission =
    parsed.data.workspacesPermission;

  if (permissionLevel === "all") {
    conversionsPermission = "write";
    linksPermission = "write";
    domainsPermission = "write";
    workspacesPermission = "write";
  } else if (permissionLevel === "read_only") {
    conversionsPermission =
      conversionsPermission === "write" ? "read" : conversionsPermission;
    linksPermission = linksPermission === "write" ? "read" : linksPermission;
    domainsPermission =
      domainsPermission === "write" ? "read" : domainsPermission;
    workspacesPermission =
      workspacesPermission === "write" ? "read" : workspacesPermission;
  }

  const created = await db.workspaceApiKey.create({
    data: {
      name: parsed.data.name,
      key: plaintextKey,
      workspaceId: access.workspace.id,
      createdBy: session.user.id,
      permissionLevel,
      linksPermission,
      domainsPermission,
      workspacesPermission,
      conversionsPermission,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      permissionLevel: true,
      linksPermission: true,
      domainsPermission: true,
      workspacesPermission: true,
      conversionsPermission: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return Response.json(
    {
      ...created,
      key: plaintextKey,
      warning: "Store this key securely. It will not be shown again.",
    },
    { status: 201 },
  );
}
