import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { generateApiKey, maskApiKey } from "@/lib/api-keys/generate";

const createKeySchema = z.object({
  name: z.string().min(1).max(80),
});

async function getWorkspaceForUser(workspaceslug: string, userId: string) {
  return db.workspace.findFirst({
    where: {
      slug: workspaceslug,
      deletedAt: null,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: { id: true, userId: true },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceslug } = await params;
  const workspace = await getWorkspaceForUser(workspaceslug, session.user.id);
  if (!workspace) {
    return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
  }

  const keys = await db.workspaceApiKey.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      key: true,
      leadsPermission: true,
      lastUsed: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return jsonWithETag(req, {
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      maskedKey: maskApiKey(key.key),
      leadsPermission: key.leadsPermission,
      lastUsed: key.lastUsed,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceslug } = await params;
  const workspace = await getWorkspaceForUser(workspaceslug, session.user.id);
  if (!workspace) {
    return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
  }

  if (workspace.userId !== session.user.id) {
    return jsonWithETag(req, { error: "Forbidden" }, { status: 403 });
  }

  const body = createKeySchema.parse(await req.json());
  const key = generateApiKey();

  const apiKey = await db.workspaceApiKey.create({
    data: {
      name: body.name,
      key,
      workspaceId: workspace.id,
      createdBy: session.user.id,
      permissionLevel: "restricted",
      leadsPermission: "write",
    },
    select: {
      id: true,
      name: true,
      key: true,
      leadsPermission: true,
      createdAt: true,
    },
  });

  return jsonWithETag(
    req,
    {
      key: apiKey,
      endpoint: "https://api.slugy.co/leads_track",
    },
    { status: 201 },
  );
}
