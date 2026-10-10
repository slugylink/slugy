import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/middleware/client-ip";
import { checkShareReportRateLimit } from "@/lib/middleware/rate-limit";
import { db } from "@/server/db";
import { campaignReport } from "@/lib/campaigns/report";
import { CampaignReportView } from "@/components/web/campaigns/report";
import {
  getWorkspaceOwnerPlanType,
  canUseSalesAnalytics,
} from "@/lib/subscription/entitlements";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();
  const limit = await checkShareReportRateLimit(getClientIp(await headers()));
  if (!limit.success)
    return <p className="p-8">Too many requests. Please try again shortly.</p>;
  const campaign = await db.campaign.findUnique({
    where: { shareToken: token },
    include: { workspace: { select: { deletedAt: true } } },
  });
  if (
    !campaign ||
    campaign.workspace.deletedAt ||
    !canUseSalesAnalytics(await getWorkspaceOwnerPlanType(campaign.workspaceId))
  )
    notFound();
  const report = await campaignReport(
    campaign.workspaceId,
    campaign.id,
    campaign.showRevenue,
    campaign.showCost,
  );
  if (!report) notFound();
  // Only aggregate information crosses the public page boundary.
  report.links = [];
  report.costs = [];
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">{campaign.name}</h1>
      <CampaignReportView report={report} />
    </main>
  );
}
