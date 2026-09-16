import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiErrors } from "@/lib/api-response";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  analyticsFilterFieldsSchema,
  tinybirdFilterParams,
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

const PRIVATE_NO_STORE = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
};

export const dynamic = "force-dynamic";

const analyticsPropsSchema = analyticsFilterFieldsSchema
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
      return apiErrors.forbidden("Lead tracking requires a Pro plan.");
    }

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

    const result = await tinybird.leadsAnalytics.query({
      workspace_id: workspaceId,
      ...tinybirdFilterParams(props),
    });

    const rows = (result.data ?? []).map((row) => ({
      ...row,
      clicks: Number(row.clicks),
    }));

    const analyticsData = transformTinybirdAnalytics(
      rows,
      normalizedMetrics,
      props.timePeriod,
    );

    return NextResponse.json(analyticsData, {
      status: 200,
      headers: {
        ...PRIVATE_NO_STORE,
        "X-Analytics-Event": "leads",
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
