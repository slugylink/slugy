import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import {
  INTEGRATION_EVENTS,
  isIntegrationEvent,
} from "@/lib/integrations/catalog";
import {
  encryptSecret,
  generateWebhookSecret,
  hashWebhookSecret,
  webhookSecretHint,
} from "@/lib/integrations/encrypt";
import {
  getWorkspaceBySlugForMember,
  requireWorkspaceManager,
} from "@/lib/integrations/workspace";

const createSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.string().min(1).max(64)).min(1).max(10),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug } = await params;
  const workspace = await getWorkspaceBySlugForMember(
    workspaceslug,
    session.user.id,
  );
  if (!workspace)
    return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });

  const endpoints = await db.webhookEndpoint.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      secretHint: true,
      events: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return jsonWithETag(req, { endpoints, supportedEvents: INTEGRATION_EVENTS });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
  const { workspaceslug } = await params;
  const workspace = await requireWorkspaceManager(
    workspaceslug,
    session.user.id,
  );
  if (!workspace)
    return jsonWithETag(req, { error: "Forbidden" }, { status: 403 });

  const body = createSchema.parse(await req.json());
  for (const e of body.events) {
    if (!isIntegrationEvent(e)) {
      return jsonWithETag(
        req,
        { error: `Unsupported event: ${e}` },
        { status: 400 },
      );
    }
  }

  const count = await db.webhookEndpoint.count({
    where: { workspaceId: workspace.id },
  });
  if (count >= 20) {
    return jsonWithETag(
      req,
      { error: "Webhook limit reached (20 per workspace)." },
      { status: 403 },
    );
  }

  const rawSecret = generateWebhookSecret();
  const endpoint = await db.webhookEndpoint.create({
    data: {
      workspaceId: workspace.id,
      url: body.url,
      secretHash: hashWebhookSecret(rawSecret),
      secretHint: webhookSecretHint(rawSecret),
      secretEnc: encryptSecret(rawSecret),
      events: body.events,
      createdBy: session.user.id,
    },
    select: {
      id: true,
      url: true,
      secretHint: true,
      events: true,
      active: true,
      createdAt: true,
    },
  });

  // Raw secret returned once — Zapier/Make custom hooks ignore it, custom
  // servers verify `slugy-signature` with it.
  return jsonWithETag(
    req,
    { endpoint: { ...endpoint, secret: rawSecret } },
    { status: 201 },
  );
}
