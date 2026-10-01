import { type NextRequest } from "next/server";
import { z } from "zod";
import { apiErrors } from "@/lib/api-response";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { serveCachedAnalytics } from "@/lib/analytics/result-cache";
import {
  salesLeadFilterFieldsSchema,
  tinybirdLeadsFilterParams,
} from "@/lib/analytics/query-params";
import {
  canUseLeadTracking,
  getWorkspaceOwnerPlanTypeBySlug,
} from "@/lib/subscription/entitlements";
import {
  transformTinybirdAnalytics,
  type AnalyticsMetric,
  type TimePeriod,
} from "@/lib/analytics/transform-tinybird";
import { tinybird } from "@/lib/tinybird/could/tinybird";
import { clampPeriodByRetention } from "@/lib/subscription/retention";

export const dynamic = "force-dynamic";

const analyticsPropsSchema = salesLeadFilterFieldsSchema
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

    const props = analyticsPropsSchema.parse(raw);

    const access = await requireWorkspaceAccess(workspaceslug);
    if (!access.ok) {
      return access.response;
    }

    const workspaceId = access.workspace.id;

    const planType = await getWorkspaceOwnerPlanTypeBySlug(workspaceslug);
    if (!canUseLeadTracking(planType)) {
      return apiErrors.forbidden(
        "Lead analytics requires a Pro or Growth plan.",
      );
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
    ];

    const normalizedMetrics = Array.from(
      new Set(
        requestedMetrics.map((metric) => (metric === "os" ? "oses" : metric)),
      ),
    ) as AnalyticsMetric[];

    if (!process.env.TINYBIRD_TOKEN && !process.env.TINYBIRD_API_KEY) {
      return apiErrors.serviceUnavailable("Analytics service unavailable");
    }

    return serveCachedAnalytics(request, {
      workspaceId,
      event: "leads",
      effectiveProps: effectiveProps as Record<string, unknown>,
      normalizedMetrics: normalizedMetrics.map(String),
      extraHeaders: { "X-Analytics-Event": "leads" },
      compute: async () => {
        const result = await tinybird.leadsAnalytics.query({
          workspace_id: workspaceId,
          ...tinybirdLeadsFilterParams(effectiveProps),
        });

        const rows = (result.data ?? []).map((row) => ({
          ...row,
          clicks: Number(row.clicks),
        }));

        return transformTinybirdAnalytics(rows, normalizedMetrics, timePeriod);
      },
    });
  } catch (err) {
    console.error("Leads analytics API error:", err);
    if (err instanceof z.ZodError) {
      return apiErrors.validationError(err.errors, "Invalid parameters");
    }
    return apiErrors.serviceUnavailable(
      "Leads analytics temporarily unavailable",
    );
  }
}
