import { NextResponse } from "next/server";
import { stringify } from "csv-stringify/sync";
import { campaignAccess, campaignError } from "@/lib/campaigns/access";
import { campaignReport } from "@/lib/campaigns/report";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceslug: string; id: string }> },
) {
  try {
    const { workspaceslug, id } = await params;
    const costs = new URL(request.url).searchParams.get("type") === "costs";
    const access = await campaignAccess(request, workspaceslug, costs);
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
    const rows = costs
      ? report.costs
      : (report.money.length ? report.money : [{}]).map((money) => ({
          clicks: report.clicks,
          leads: report.leads,
          sales: report.sales,
          ...money,
        }));
    return new Response(
      stringify(rows, {
        header: true,
        escape_formulas: true,
        ...(costs ? { columns: ["date", "spend", "currency", "source"] } : {}),
      }),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="campaign-${costs ? "costs" : "report"}.csv"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return campaignError(error);
  }
}
