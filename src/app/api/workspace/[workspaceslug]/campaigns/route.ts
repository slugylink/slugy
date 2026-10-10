import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { campaignAccess, campaignError } from "@/lib/campaigns/access";
import { campaignSchema } from "@/lib/campaigns/validation";
type Context = { params: Promise<{ workspaceslug: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const access = await campaignAccess(
      request,
      (await context.params).workspaceslug,
    );
    if (!access.ok) return access.response;
    const [campaigns, trafficSources, links] = await Promise.all([
      db.campaign.findMany({
        where: { workspaceId: access.workspaceId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { links: true } }, trafficSource: true },
      }),
      db.trafficSource.findMany({ orderBy: { name: "asc" } }),
      db.link.findMany({
        where: { workspaceId: access.workspaceId, deletedAt: null },
        select: { id: true, slug: true, domain: true, campaignId: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);
    return NextResponse.json({
      campaigns,
      trafficSources,
      links,
      canSeeMoney: access.canSeeMoney,
    });
  } catch (error) {
    return campaignError(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const access = await campaignAccess(
      request,
      (await context.params).workspaceslug,
    );
    if (!access.ok) return access.response;
    const data = campaignSchema.parse(await request.json());
    return NextResponse.json(
      await db.campaign.create({
        data: { ...data, workspaceId: access.workspaceId },
      }),
      { status: 201 },
    );
  } catch (error) {
    return campaignError(error);
  }
}
