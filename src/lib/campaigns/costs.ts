import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { db } from "@/server/db";
import { campaignAccess, campaignError } from "./access";
import { costsSchema } from "./validation";

export async function importCampaignCosts(
  request: Request,
  id: string,
  slug?: string,
) {
  try {
    const access = await campaignAccess(request, slug, true);
    if (!access.ok) return access.response;
    const campaign = await db.campaign.findFirst({
      where: { id, workspaceId: access.workspaceId },
      include: { trafficSource: true },
    });
    if (!campaign)
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    if (campaign.trafficSource && !campaign.trafficSource.costImportEnabled)
      return NextResponse.json(
        { error: "Cost imports disabled for this source" },
        { status: 400 },
      );
    const text = await request.text();
    if (text.length > 250000)
      return NextResponse.json(
        { error: "Import exceeds 250 KB" },
        { status: 413 },
      );
    let input: unknown;
    try {
      input = request.headers.get("content-type")?.includes("text/csv")
        ? parse(text, {
            columns: true,
            skip_empty_lines: true,
            bom: true,
            trim: true,
          })
        : JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid CSV or JSON" },
        { status: 400 },
      );
    }
    const rows = costsSchema.parse(Array.isArray(input) ? input : [input]);
    await db.$transaction(
      rows.map((row) => {
        const data = {
          ...row,
          date: new Date(`${row.date}T00:00:00Z`),
          campaignId: id,
        };
        return db.campaignCost.upsert({
          where: {
            campaignId_date_currency_source: {
              campaignId: id,
              date: data.date,
              currency: row.currency,
              source: row.source,
            },
          },
          create: data,
          update: { spend: row.spend },
        });
      }),
    );
    return NextResponse.json({ imported: rows.length });
  } catch (error) {
    return campaignError(error);
  }
}
