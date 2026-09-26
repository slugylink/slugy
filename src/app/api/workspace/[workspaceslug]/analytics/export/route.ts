import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stringify } from "csv-stringify/sync";
import { apiErrors } from "@/lib/api-response";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import {
  analyticsFilterFieldsSchema,
  tinybirdFilterParams,
  tinybirdLeadsFilterParams,
} from "@/lib/analytics/query-params";
import { tinybird } from "@/lib/tinybird/could/tinybird";
import { getWorkspaceOwnerPlanType } from "@/lib/subscription/entitlements";
import { clampPeriodByRetention } from "@/lib/subscription/retention";
import type { TimePeriod } from "@/lib/analytics/transform-tinybird";

export const dynamic = "force-dynamic";

// Cap rows to keep CSV generation fast (Dub-style: "may take up to a minute").
const MAX_EXPORT_ROWS = 50000;

const exportQuerySchema = analyticsFilterFieldsSchema
  .extend({
    event: z.enum(["clicks", "leads", "sales"]).optional().default("clicks"),
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
      event: (search.get("event") as "clicks" | "leads" | "sales") || "clicks",
    };

    const props = exportQuerySchema.parse(raw);

    const access = await requireWorkspaceAccess(workspaceslug);
    if (!access.ok) {
      return access.response;
    }

    const workspaceId = access.workspace.id;

    if (!process.env.TINYBIRD_TOKEN && !process.env.TINYBIRD_API_KEY) {
      return apiErrors.serviceUnavailable("Analytics service unavailable");
    }

    const planType = await getWorkspaceOwnerPlanType(workspaceId);
    const timePeriod = clampPeriodByRetention(planType, props.timePeriod);
    const effectiveProps = { ...props, timePeriod };

    let rows: Array<Record<string, unknown>> = [];

    const leadsBaseProps = {
      ...effectiveProps,
      event_name: null,
      customer_external_id: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
    };

    if (props.event === "sales") {
      const result = await tinybird.salesAnalytics.query({
        workspace_id: workspaceId,
        ...tinybirdLeadsFilterParams(leadsBaseProps),
      });
      rows = (result.data ?? []).slice(0, MAX_EXPORT_ROWS).map((row) => ({
        timestamp: row.day,
        short_link: row.sales_slug
          ? `${row.domain ?? "slugy.co"}/${row.sales_slug}`
          : "",
        destination: row.sales_url ?? "",
        country: row.country ?? "",
        city: row.city ?? "",
        continent: row.continent ?? "",
        device: row.device ?? "",
        browser: row.browser ?? "",
        os: row.os ?? "",
        referrer: row.referer ?? "",
        event: row.event_name ?? "",
        customer_id: row.sample_customer_id ?? "",
        currency: row.sale_currency ?? "",
        utm_source: row.utm_source ?? "",
        utm_medium: row.utm_medium ?? "",
        utm_campaign: row.utm_campaign ?? "",
        utm_term: row.utm_term ?? "",
        utm_content: row.utm_content ?? "",
        sales: Number(row.clicks ?? 0),
        revenue: Number(row.revenue ?? 0),
      }));
    } else if (props.event === "leads") {
      const result = await tinybird.leadsAnalytics.query({
        workspace_id: workspaceId,
        ...tinybirdLeadsFilterParams(leadsBaseProps),
      });
      rows = (result.data ?? []).slice(0, MAX_EXPORT_ROWS).map((row) => ({
        timestamp: row.day,
        short_link:
          row["meta.slug"] != null
            ? `${row.domain ?? "slugy.co"}/${row["meta.slug"]}`
            : "",
        destination: row["meta.url"] ?? "",
        country: row.country ?? "",
        city: row.city ?? "",
        continent: row.continent ?? "",
        device: row.device ?? "",
        browser: row.browser ?? "",
        os: row.os ?? "",
        referrer: row.referer ?? "",
        event: row.event_name ?? "",
        customer_id: row.sample_customer_id ?? "",
        utm_source: row.utm_source ?? "",
        utm_medium: row.utm_medium ?? "",
        utm_campaign: row.utm_campaign ?? "",
        utm_term: row.utm_term ?? "",
        utm_content: row.utm_content ?? "",
        leads: Number(row.clicks ?? 0),
      }));
    } else {
      const result = await tinybird.analyticsPipe.query({
        workspace_id: workspaceId,
        ...tinybirdFilterParams(effectiveProps),
      });
      rows = (result.data ?? []).slice(0, MAX_EXPORT_ROWS).map((row) => ({
        timestamp: row.day,
        short_link:
          row["meta.slug"] != null
            ? `${row.domain ?? "slugy.co"}/${row["meta.slug"]}`
            : "",
        destination: row["meta.url"] ?? "",
        country: row.country ?? "",
        city: row.city ?? "",
        continent: row.continent ?? "",
        device: row.device ?? "",
        browser: row.browser ?? "",
        os: row.os ?? "",
        referrer: row.referer ?? "",
        utm_source: row.utm_source ?? "",
        utm_medium: row.utm_medium ?? "",
        utm_campaign: row.utm_campaign ?? "",
        utm_term: row.utm_term ?? "",
        utm_content: row.utm_content ?? "",
        clicks: Number(row.clicks ?? 0),
      }));
    }

    if (rows.length === 0) {
      const emptyCsv = stringify([], {
        header: true,
        columns: [
          "timestamp",
          "short_link",
          "destination",
          "country",
          "city",
          "continent",
          "device",
          "browser",
          "os",
          "referrer",
          "clicks",
        ],
      });
      return new NextResponse(emptyCsv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="slugy-analytics-${workspaceslug}-${timePeriod}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const columns = Object.keys(rows[0] as Record<string, unknown>);
    const csv = stringify(rows, { header: true, columns });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="slugy-analytics-${workspaceslug}-${timePeriod}-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Export-Rows": String(rows.length),
      },
    });
  } catch (err) {
    console.error("Analytics export API error:", err);
    if (err instanceof z.ZodError) {
      return apiErrors.validationError(err.errors, "Invalid parameters");
    }
    return apiErrors.serviceUnavailable(
      "Analytics export temporarily unavailable",
    );
  }
}
