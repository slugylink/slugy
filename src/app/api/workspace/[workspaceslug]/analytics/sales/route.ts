import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrors } from "@/lib/api-response";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  salesLeadFilterFieldsSchema,
  tinybirdLeadsFilterParams,
} from "@/lib/analytics/query-params";
import {
  canUseSalesAnalytics,
  getWorkspaceOwnerPlanTypeBySlug,
} from "@/lib/subscription/entitlements";
import {
  transformTinybirdAnalytics,
  type AnalyticsMetric,
  type TimePeriod,
} from "@/lib/analytics/transform-tinybird";
import { tinybird } from "@/lib/tinybird/could/tinybird";
import { clampPeriodByRetention } from "@/lib/subscription/retention";

const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
};

export const dynamic = "force-dynamic";

const salesPropsSchema = salesLeadFilterFieldsSchema
  .extend({
    metrics: z
      .array(
        z.enum([
          "totalClicks",
          "clicksOverTime",
          "links",
          "cities",
          "countries",
          "continents",
          "devices",
          "browsers",
          "os",
          "oses",
          "referrers",
          "destinations",
          "utmSources",
          "utmMediums",
          "utmCampaigns",
          "utmTerms",
          "utmContents",
        ]),
      )
      .optional(),
  })
  .strict();

/**
 * Business-only sales analytics: revenue-attributed lead events
 * (sale_amount > 0) broken down by the standard analytics dimensions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const { workspaceslug } = await params;
    const search = request.nextUrl.searchParams;

    const raw = {
      timePeriod: (search.get("time_period") as TimePeriod) || "24h",
      slug_key: search.get("slug_key") || null,
      country_key: search.get("country_key") || null,
      city_key: search.get("city_key") || null,
      continent_key: search.get("continent_key") || null,
      browser_key: search.get("browser_key") || null,
      os_key: search.get("os_key") || null,
      referrer_key: search.get("referrer_key") || null,
      device_key: search.get("device_key") || null,
      destination_key: search.get("destination_key") || null,
      domain_key: search.get("domain_key") || null,
      event_name: search.get("event_name") || null,
      customer_external_id: search.get("customer_external_id") || null,
      utm_source: search.get("utm_source") || null,
      utm_medium: search.get("utm_medium") || null,
      utm_campaign: search.get("utm_campaign") || null,
      utm_term: search.get("utm_term") || null,
      utm_content: search.get("utm_content") || null,
      metrics: search.get("metrics")
        ? search.get("metrics")!.split(",").filter(Boolean)
        : undefined,
    };

    const props = salesPropsSchema.parse(raw);

    const access = await requireWorkspaceAccess(workspaceslug);
    if (!access.ok) {
      return access.response;
    }

    const workspaceId = access.workspace.id;

    const planType = await getWorkspaceOwnerPlanTypeBySlug(workspaceslug);
    if (!canUseSalesAnalytics(planType)) {
      return apiErrors.forbidden("Sales analytics requires a Business plan.");
    }

    const timePeriod = clampPeriodByRetention(planType, props.timePeriod);
    const effectiveProps = { ...props, timePeriod };

    const requestedMetrics = props.metrics || [
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
      "utmSources",
      "utmMediums",
      "utmCampaigns",
      "utmTerms",
      "utmContents",
    ];

    const normalizedMetrics = Array.from(
      new Set(
        requestedMetrics.map((metric) => (metric === "os" ? "oses" : metric)),
      ),
    ) as AnalyticsMetric[];

    if (!process.env.TINYBIRD_TOKEN && !process.env.TINYBIRD_API_KEY) {
      return apiErrors.serviceUnavailable("Analytics service unavailable");
    }

    const result = await tinybird.salesAnalytics.query({
      workspace_id: workspaceId,
      ...tinybirdLeadsFilterParams(effectiveProps),
    });

    const rows = (result.data ?? []).map((row) => ({
      ...row,
      clicks: Number(row.clicks),
      revenue: Number(row.revenue ?? 0),
      unique_customers: Number(row.unique_customers ?? 0),
      "meta.slug": row.sales_slug ?? "",
      "meta.url": row.sales_url ?? "",
    }));

    const analyticsData = transformTinybirdAnalytics(
      rows,
      normalizedMetrics,
      timePeriod,
    );

    const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const totalSales = rows.reduce((sum, row) => sum + row.clicks, 0);

    return NextResponse.json(
      { ...analyticsData, totalRevenue, totalSales },
      {
        status: 200,
        headers: {
          ...PRIVATE_NO_STORE,
          "X-Analytics-Event": "sales",
        },
      },
    );
  } catch (err) {
    console.error("Sales analytics API error:", err);
    if (err instanceof z.ZodError) {
      return apiErrors.validationError(err.errors, "Invalid parameters");
    }
    return apiErrors.serviceUnavailable(
      "Sales analytics temporarily unavailable",
    );
  }
}
