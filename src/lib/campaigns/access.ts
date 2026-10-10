import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { authenticateApiKey } from "@/lib/api-keys/auth";
import { db } from "@/server/db";
import {
  canUseLeadTracking,
  canUseSalesAnalytics,
  getWorkspaceOwnerPlanType,
} from "@/lib/subscription/entitlements";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export async function campaignAccess(
  request: Request,
  slug?: string,
  money = false,
) {
  let workspaceId: string;
  if (request.headers.has("authorization")) {
    const auth = await authenticateApiKey(
      request.headers.get("authorization"),
      request.method === "GET" ? "read" : "write",
      "links",
    );
    if (!auth.ok)
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: auth.message },
          { status: auth.status },
        ),
      };
    const workspace = await db.workspace.findFirst({
      where: {
        id: auth.apiKey.workspaceId,
        deletedAt: null,
        ...(slug ? { slug } : {}),
      },
    });
    if (!workspace)
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Workspace not found" },
          { status: 404 },
        ),
      };
    workspaceId = workspace.id;
  } else {
    if (!slug)
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Bearer API key required" },
          { status: 401 },
        ),
      };
    const access = await requireWorkspaceAccess(slug);
    if (!access.ok) return access;
    workspaceId = access.workspace.id;
  }
  const plan = await getWorkspaceOwnerPlanType(workspaceId);
  if (!(money ? canUseSalesAnalytics(plan) : canUseLeadTracking(plan)))
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: money ? "Growth plan required" : "Pro or Growth plan required",
        },
        { status: 403 },
      ),
    };
  return {
    ok: true as const,
    workspaceId,
    canSeeMoney: canUseSalesAnalytics(plan),
  };
}

export function campaignError(error: unknown) {
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return NextResponse.json(
      {
        error: "Invalid input",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2002", "P2003"].includes(error.code)
  )
    return NextResponse.json(
      { error: "Campaign slug already exists or traffic source is invalid" },
      { status: 409 },
    );
  console.error("Campaign request failed", error);
  return NextResponse.json(
    { error: "Campaign service unavailable" },
    { status: 503 },
  );
}
