import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { requireWorkspaceManager } from "@/lib/integrations/workspace";

const patchSchema = z
  .object({
    status: z.enum(["connected", "disabled"]).optional(),
    config: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((v) => v.status || v.config || v.metadata, {
    message: "Nothing to update",
  });

// Allowlist: only these config keys may be set via this endpoint. OAuth
// callbacks own all credentials server-side; anything token-shaped is rejected.
const ALLOWED_CONFIG_KEYS: Record<string, readonly string[]> = {
  slack: ["channelId", "leadEvents", "saleEvents"],
  shopify: ["shop"],
  polar: [],
  wordpress: ["siteUrl"],
  zapier: [],
  make: [],
  stripe: [],
  segment: [],
};

const TOKENISH = /token|secret|api[_-]?key|auth|password|private/i;

function sanitizeConfig(
  provider: string,
  config: Record<string, unknown>,
): { ok: true; config: Record<string, unknown> } | { ok: false; key: string } {
  const allowed = ALLOWED_CONFIG_KEYS[provider] ?? [];
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (TOKENISH.test(key)) return { ok: false, key };
    if (!allowed.includes(key)) return { ok: false, key };
    if (typeof value !== "string" && typeof value !== "boolean") {
      return { ok: false, key };
    }
    clean[key] = value;
  }
  return { ok: true, config: clean };
}

/** Manage non-OAuth providers (Slack toggles, Shopify shop, Polar settings). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; provider: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug, provider } = await params;
  const workspace = await requireWorkspaceManager(
    workspaceslug,
    session.user.id,
  );
  if (!workspace)
    return jsonWithETag(req, { error: "Forbidden" }, { status: 403 });

  const body = patchSchema.parse(await req.json());
  let cleanConfig: Record<string, unknown> | undefined;
  if (body.config) {
    const sanitized = sanitizeConfig(provider, body.config);
    if (!sanitized.ok) {
      return jsonWithETag(
        req,
        { error: `Config key not allowed: ${sanitized.key}` },
        { status: 400 },
      );
    }
    cleanConfig = sanitized.config;
  }

  const existing = await db.integration.findUnique({
    where: { workspaceId_provider: { workspaceId: workspace.id, provider } },
    select: { config: true },
  });
  const merged = {
    ...((existing?.config ?? {}) as Record<string, unknown>),
    ...(cleanConfig ?? {}),
  };

  const row = await db.integration.upsert({
    where: { workspaceId_provider: { workspaceId: workspace.id, provider } },
    create: {
      workspaceId: workspace.id,
      provider,
      status: body.status ?? "connected",
      config: merged as object,
      metadata: (body.metadata ?? {}) as object,
      createdBy: session.user.id,
    },
    update: {
      ...(body.status && { status: body.status }),
      ...(cleanConfig && { config: merged as object }),
      ...(body.metadata && { metadata: body.metadata as object }),
    },
    select: { provider: true, status: true, updatedAt: true },
  });
  return jsonWithETag(req, { integration: row });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; provider: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug, provider } = await params;
  const workspace = await requireWorkspaceManager(
    workspaceslug,
    session.user.id,
  );
  if (!workspace)
    return jsonWithETag(req, { error: "Forbidden" }, { status: 403 });

  await db.integration.deleteMany({
    where: { workspaceId: workspace.id, provider },
  });
  return jsonWithETag(req, { ok: true });
}
