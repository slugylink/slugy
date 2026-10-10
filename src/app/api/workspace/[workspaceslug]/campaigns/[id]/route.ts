import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { campaignAccess, campaignError } from "@/lib/campaigns/access";
import { campaignSchema } from "@/lib/campaigns/validation";
import { campaignReport } from "@/lib/campaigns/report";
import { invalidateLinkCache } from "@/lib/cache-utils/link-cache";
type Context = { params: Promise<{ workspaceslug: string; id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { workspaceslug, id } = await context.params;
    const access = await campaignAccess(request, workspaceslug);
    if (!access.ok) return access.response;
    const report = await campaignReport(
      access.workspaceId,
      id,
      access.canSeeMoney,
      access.canSeeMoney,
    );
    if (!report)
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    return NextResponse.json(report);
  } catch (error) {
    return campaignError(error);
  }
}
const updateSchema = campaignSchema
  .partial()
  .extend({
    linkIds: z.array(z.string()).max(1000).optional(),
    sharing: z.boolean().optional(),
    showRevenue: z.boolean().optional(),
    showCost: z.boolean().optional(),
  })
  .strict();
export async function PATCH(request: Request, context: Context) {
  try {
    const { workspaceslug, id } = await context.params;
    const access = await campaignAccess(request, workspaceslug);
    if (!access.ok) return access.response;
    const { linkIds, sharing, ...data } = updateSchema.parse(
      await request.json(),
    );
    if ((sharing || data.showRevenue || data.showCost) && !access.canSeeMoney)
      return NextResponse.json(
        { error: "Sharing money reports requires Growth" },
        { status: 403 },
      );
    const campaign = await db.campaign.findFirst({
      where: { id, workspaceId: access.workspaceId },
    });
    if (!campaign)
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    const ids = linkIds && [...new Set(linkIds)];
    const links = ids
      ? await db.link.findMany({
          where: {
            workspaceId: access.workspaceId,
            deletedAt: null,
            OR: [{ id: { in: ids } }, { campaignId: id }],
          },
          select: { id: true, slug: true, domain: true },
        })
      : [];
    if (ids && ids.some((linkId) => !links.some((link) => link.id === linkId)))
      return NextResponse.json(
        { error: "Link not found in this workspace" },
        { status: 400 },
      );
    const result = await db.$transaction(async (tx) => {
      if (ids) {
        await tx.link.updateMany({
          where: {
            workspaceId: access.workspaceId,
            campaignId: id,
            id: { notIn: ids },
          },
          data: { campaignId: null },
        });
        await tx.link.updateMany({
          where: {
            workspaceId: access.workspaceId,
            id: { in: ids },
            deletedAt: null,
          },
          data: { campaignId: id },
        });
      }
      return tx.campaign.update({
        where: { id },
        data: {
          ...data,
          ...(sharing !== undefined
            ? {
                shareToken: sharing
                  ? campaign.shareToken || randomBytes(24).toString("hex")
                  : null,
              }
            : {}),
        },
      });
    });
    await Promise.all(
      links.map((link) => invalidateLinkCache(link.slug, link.domain)),
    );
    return NextResponse.json(result);
  } catch (error) {
    return campaignError(error);
  }
}
