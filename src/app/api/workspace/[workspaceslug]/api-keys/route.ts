import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import {
  apiKeyHint,
  generateApiKey,
  hashApiKey,
} from "@/lib/api-keys/generate";
import { getSubscriptionWithPlan } from "@/lib/subscription/queries";
import { canUseLeadTracking } from "@/lib/subscription/entitlements";

const createKeySchema = z.object({
  name: z.string().min(1).max(80),
  linksPermission: z.enum(["none", "write"]).optional().default("write"),
  leadsPermission: z.enum(["none", "write"]).optional().default("none"),
});

const MAX_KEYS_PER_WORKSPACE = 20;

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

  // Listing is metadata-only on any plan; creation enforces per-scope gates.
  const keys = await db.workspaceApiKey.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    // Never select the secret: list responses carry the stored hint only.
    select: {
      id: true,
      name: true,
      keyHint: true,
      linksPermission: true,
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
      maskedKey: key.keyHint ?? "slugy_…(legacy)",
      linksPermission: key.linksPermission,
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

  const subscriptionResult = await getSubscriptionWithPlan(workspace.userId);
  const planType = subscriptionResult.subscription?.plan?.planType ?? null;

  const body = createKeySchema.parse(await req.json());

  // Scope-aware gating: links-only keys work on any plan (quotas still
  // enforced per call); leads:write is the paid tracking feature.
  if (body.leadsPermission === "write" && !canUseLeadTracking(planType)) {
    return jsonWithETag(
      req,
      { error: "Lead tracking requires a Pro or Growth plan." },
      { status: 403 },
    );
  }

  const liveCount = await db.workspaceApiKey.count({
    where: { workspaceId: workspace.id, deletedAt: null },
  });
  if (liveCount >= MAX_KEYS_PER_WORKSPACE) {
    return jsonWithETag(
      req,
      {
        error: `API key limit reached (${MAX_KEYS_PER_WORKSPACE} per workspace). Revoke unused keys first.`,
      },
      { status: 403 },
    );
  }

  const key = generateApiKey();
  const keyHash = hashApiKey(key);

  const apiKey = await db.workspaceApiKey.create({
    data: {
      name: body.name,
      // Phase-out: raw `key` column holds the non-secret hash until the
      // follow-up migration drops it. The bearer secret exists only here.
      key: keyHash,
      keyHash,
      keyHint: apiKeyHint(key),
      workspaceId: workspace.id,
      createdBy: session.user.id,
      permissionLevel: "restricted",
      linksPermission: body.linksPermission,
      leadsPermission: body.leadsPermission,
    },
    select: {
      id: true,
      name: true,
      keyHint: true,
      linksPermission: true,
      leadsPermission: true,
      createdAt: true,
    },
  });

  return jsonWithETag(
    req,
    {
      // Full secret returned ONCE — never persisted or re-readable.
      key: { ...apiKey, key },
      endpoints: {
        links: "https://app.slugy.co/api/v1/link",
        leads: "https://api.slugy.co/leads_track",
      },
    },
    { status: 201 },
  );
}
