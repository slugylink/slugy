import { db } from "@/server/db";
import { moneyMetrics } from "./validation";
import { getTinybirdConfig } from "@/lib/tinybird/http";

export async function campaignReport(
  workspaceId: string,
  campaignId: string,
  showRevenue: boolean,
  showCost: boolean,
) {
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: {
      trafficSource: true,
      links: {
        where: { deletedAt: null },
        select: { id: true, slug: true, domain: true },
      },
    },
  });
  if (!campaign) return null;
  // Aggregate in Postgres: report memory use must not grow with raw click volume.
  const [funnelRows, trafficRows, revenueRows, costs, dimensions] =
    await Promise.all([
      db.$queryRaw<
        { leads: bigint; sales: bigint; events: bigint; matched: bigint }[]
      >`
      SELECT count(DISTINCT e."customerExternalId") FILTER (WHERE e."eventName" <> 'sale' AND e."saleAmount" = 0) AS leads,
        count(*) FILTER (WHERE e."eventName" = 'sale' OR e."saleAmount" > 0) AS sales,
        count(*) AS events, count(a.id) AS matched
      FROM lead_events e LEFT JOIN analytics a ON a."clickId" = e."clickId" AND a."campaignId" = e."campaignId"
      WHERE e."workspaceId" = ${workspaceId} AND e."campaignId" = ${campaignId}
    `,
      db.$queryRaw<
        {
          clicks: bigint;
          visitors: bigint;
          measured: bigint;
          bots: bigint;
          duplicates: bigint;
        }[]
      >`
      SELECT count(*) AS clicks, count(DISTINCT NULLIF("ipAddress", '')) AS visitors,
        count(*) FILTER (WHERE "qualityScore" IS NOT NULL) AS measured,
        count(*) FILTER (WHERE "qualityScore" IS NOT NULL AND "isBot") AS bots,
        count(*) FILTER (WHERE "qualityScore" IS NOT NULL AND "isDuplicate") AS duplicates
      FROM analytics WHERE "campaignId" = ${campaignId}
    `,
      showRevenue
        ? db.leadEvent.groupBy({
            by: ["saleCurrency"],
            where: {
              workspaceId,
              campaignId,
              OR: [{ eventName: "sale" }, { saleAmount: { gt: 0 } }],
            },
            _sum: { saleAmount: true },
          })
        : [],
      showCost
        ? db.campaignCost.findMany({
            where: { campaignId },
            orderBy: { date: "desc" },
          })
        : [],
      db.$queryRaw<
        {
          device: string | null;
          browser: string | null;
          country: string | null;
          conversions: bigint;
        }[]
      >`
      SELECT a.device, a.browser, a.country, count(DISTINCT a."clickId") AS conversions
      FROM analytics a JOIN lead_events e ON e."clickId" = a."clickId" AND e."campaignId" = a."campaignId"
      WHERE e."workspaceId" = ${workspaceId} AND e."campaignId" = ${campaignId}
      GROUP BY a.device, a.browser, a.country
    `,
    ]);
  const funnel = funnelRows[0];
  const traffic = trafficRows[0];
  const leads = Number(funnel.leads);
  let totalClicks = Number(traffic.clicks);
  let visitors = Number(traffic.visitors);
  let clickSource = "Postgres (batch processed)";
  const { token, baseUrl } = getTinybirdConfig();
  if (token) {
    try {
      const query = new URLSearchParams({
        workspace_id: workspaceId,
        campaign_id: campaignId,
      });
      const response = await fetch(
        `${baseUrl}/v0/pipes/campaign_clicks.json?${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) throw new Error("Tinybird unavailable");
      const result = (await response.json()) as {
        data: { clicks: number; visitors: number }[];
      };
      const row = result.data?.[0];
      // Postgres includes UTM backfill that predates Tinybird campaign capture.
      if (
        row &&
        Number.isFinite(Number(row.clicks)) &&
        Number(row.clicks) >= totalClicks &&
        Number.isFinite(Number(row.visitors))
      ) {
        totalClicks = Number(row.clicks);
        visitors = Number(row.visitors);
        clickSource = "Tinybird";
      }
    } catch {
      /* Use the durable Postgres copy during Tinybird outages. */
    }
  }
  const currencies = new Set([
    ...revenueRows.map((e) => e.saleCurrency || "Unknown"),
    ...costs.map((c) => c.currency),
  ]);
  const money = [...currencies].sort().map((currency) => {
    const revenue = revenueRows
      .filter((e) => (e.saleCurrency || "Unknown") === currency)
      .reduce((sum, e) => sum + (e._sum.saleAmount || 0), 0);
    const spend = costs
      .filter((c) => c.currency === currency)
      .reduce((sum, c) => sum + Number(c.spend), 0);
    const metrics = moneyMetrics(revenue, spend, leads);
    return {
      currency,
      revenue: showRevenue ? metrics.revenue : null,
      spend: showCost ? metrics.spend : null,
      roas: showRevenue && showCost ? metrics.roas : null,
      cpa: showCost ? metrics.cpa : null,
    };
  });
  const breakdown = (dimension: "device" | "browser" | "country") => {
    const counts = new Map<string, number>();
    dimensions.forEach((c) => {
      const key = c[dimension] || "Unknown";
      counts.set(key, (counts.get(key) || 0) + Number(c.conversions));
    });
    return [...counts]
      .map(([name, conversions]) => ({ name, conversions }))
      .sort((a, b) => b.conversions - a.conversions);
  };
  const measured = Number(traffic.measured);
  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      trafficSource: campaign.trafficSource?.name,
      costModel: campaign.costModel,
      alertsEnabled: campaign.alertsEnabled,
    },
    links: campaign.links,
    clicks: totalClicks,
    visitors,
    clickSource,
    leads,
    sales: showRevenue ? Number(funnel.sales) : null,
    money,
    costs: costs.map((c) => ({
      date: c.date.toISOString().slice(0, 10),
      spend: Number(c.spend),
      currency: c.currency,
      source: c.source,
    })),
    quality: {
      measured,
      botPercent: measured ? (Number(traffic.bots) / measured) * 100 : null,
      duplicatePercent: measured
        ? (Number(traffic.duplicates) / measured) * 100
        : null,
      joinRate: Number(funnel.events)
        ? (Number(funnel.matched) / Number(funnel.events)) * 100
        : null,
      devices: breakdown("device"),
      browsers: breakdown("browser"),
      countries: breakdown("country"),
    },
  };
}
export type CampaignReport = NonNullable<
  Awaited<ReturnType<typeof campaignReport>>
>;
