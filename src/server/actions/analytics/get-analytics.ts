import { auth } from "@/lib/auth";
import { sql } from "@/server/neon"; // use your neon SQL client
import {
  type AnalyticsRequestProps,
  type AnalyticsResponse,
  getStartDate,
  processAnalyticsData,
  formatAnalyticsResponse,
  AnalyticsMetric,
} from "./analytics";
import { z } from "zod";
import { headers } from "next/headers";

const AnalyticsPropsSchema = z.object({
  workspaceslug: z.string().min(1),
  timePeriod: z.enum(["24h", "7d", "30d", "3m", "12m", "all"]),
  slug_key: z.string().nullable().optional(),
  country_key: z.string().nullable().optional(),
  city_key: z.string().nullable().optional(),
  continent_key: z.string().nullable().optional(),
  browser_key: z.string().nullable().optional(),
  os_key: z.string().nullable().optional(),
  referrer_key: z.string().nullable().optional(),
  device_key: z.string().nullable().optional(),
  destination_key: z.string().nullable().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  metrics: z.array(z.string()).optional(),
});

const ALL_METRICS: AnalyticsMetric[] = [
  "totalClicks",
  "clicksOverTime",
  "links",
  "cities",
  "countries",
  "continents",
  "devices",
  "browsers",
  "oses",
  "referrers",
  "destinations",
];

export async function getAnalytics(
  props: AnalyticsRequestProps,
): Promise<AnalyticsResponse> {
  try {
    // Validate input
    const safeProps = AnalyticsPropsSchema.parse(props);

    // Authenticate user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) throw new Error("User not authenticated");

    const startDate = getStartDate(safeProps.timePeriod);
    const metrics: AnalyticsMetric[] =
      (safeProps.metrics as AnalyticsMetric[]) ?? ALL_METRICS;

    // Build WHERE clause and params for parameterized SQL
    const whereClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;
    // Required workspace slug
    whereClauses.push(`w.slug = $${paramIdx}`);
    params.push(safeProps.workspaceslug);
    paramIdx++;
    // User access condition
    whereClauses.push(`(w."userId" = $${paramIdx} OR EXISTS (SELECT 1 FROM "members" wm WHERE wm."workspaceId" = w.id AND wm."userId" = $${paramIdx}))`);
    params.push(session.user.id);
    paramIdx++;
    // Filters based on optional keys
    if (safeProps.slug_key) { whereClauses.push(`l.slug = $${paramIdx}`); params.push(safeProps.slug_key); paramIdx++; }
    if (safeProps.destination_key) { whereClauses.push(`l.url = $${paramIdx}`); params.push(safeProps.destination_key); paramIdx++; }
    if (safeProps.country_key) { whereClauses.push(`a.country = $${paramIdx}`); params.push(safeProps.country_key); paramIdx++; }
    if (safeProps.city_key) { whereClauses.push(`a.city = $${paramIdx}`); params.push(safeProps.city_key); paramIdx++; }
    if (safeProps.continent_key) { whereClauses.push(`a.continent = $${paramIdx}`); params.push(safeProps.continent_key); paramIdx++; }
    if (safeProps.browser_key) { whereClauses.push(`a.browser = $${paramIdx}`); params.push(safeProps.browser_key); paramIdx++; }
    if (safeProps.os_key) { whereClauses.push(`a.os = $${paramIdx}`); params.push(safeProps.os_key); paramIdx++; }
    if (safeProps.referrer_key) { whereClauses.push(`a.referer = $${paramIdx}`); params.push(safeProps.referrer_key); paramIdx++; }
    if (safeProps.device_key) { whereClauses.push(`a.device = $${paramIdx}`); params.push(safeProps.device_key); paramIdx++; }
    // Date filtering
    if (safeProps.timePeriod !== "all") { whereClauses.push(`a."clickedAt" >= $${paramIdx}`); params.push(startDate); paramIdx++; }
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    // Group by the same fields as before
    const analyticsSQL = `
      SELECT a."linkId", a."clickedAt", a.country, a.city, a.continent, a.device, a.browser, a.os, a.referer, COUNT(*) as _count
      FROM analytics a
      JOIN links l ON l.id = a."linkId"
      JOIN workspaces w ON w.id = l."workspaceId"
      ${whereClause}
      GROUP BY a."linkId", a."clickedAt", a.country, a.city, a.continent, a.device, a.browser, a.os, a.referer
    `;
    const analyticsDataRaw: Record<string, unknown>[] = await sql.query(analyticsSQL, params);
    // Type the analyticsData for downstream helpers
    const analyticsData = analyticsDataRaw.map(row => ({
      linkId: row.linkId as string,
      clickedAt: row.clickedAt as Date,
      country: row.country as string | null,
      city: row.city as string | null,
      continent: row.continent as string | null,
      device: row.device as string | null,
      browser: row.browser as string | null,
      os: row.os as string | null,
      referer: row.referer as string | null,
      _count: Number(row._count),
    }));

    // Get unique link IDs for fetching link details
    const linkIds = [...new Set(analyticsData.map((item) => item.linkId))];

    // Fetch link details in parallel with data processing
    let links: { id: string; slug: string; url: string }[] = [];
    if (linkIds.length > 0) {
      const linksRaw: Record<string, unknown>[] = await sql.query("SELECT id, slug, url FROM links WHERE id = ANY($1)", [linkIds]);
      links = linksRaw.map(row => ({
        id: row.id as string,
        slug: row.slug as string,
        url: row.url as string,
      }));
    }
    // Create a map of link clicks for faster lookup
    const linkClicksMap = new Map<string, number>();
    for (const row of analyticsData) {
      linkClicksMap.set(row.linkId, (linkClicksMap.get(row.linkId) ?? 0) + Number(row._count));
    }

    // Process analytics data and format response (your existing helper functions remain same)
    const aggregationMaps = processAnalyticsData(
      analyticsData,
      safeProps.timePeriod,
      links,
      metrics,
    );

    return formatAnalyticsResponse(aggregationMaps, links, linkClicksMap, metrics);
  } catch (error) {
    console.error("[getAnalytics] Error:", error);
    throw new Error("Failed to fetch analytics data. Please try again later.");
  }
}
