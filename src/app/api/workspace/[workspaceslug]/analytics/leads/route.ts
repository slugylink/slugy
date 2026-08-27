import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { sql } from "@/server/neon";
import { apiErrors } from "@/lib/api-response";
import {
  transformTinybirdAnalytics,
  type AnalyticsMetric,
  type TimePeriod,
} from "@/lib/analytics/transform-tinybird";
import { tinybird } from "@/lib/tinybird/could/tinybird";

const CACHE_DURATION = 60;
const STALE_WHILE_REVALIDATE = 60;

const analyticsPropsSchema = z
  .object({
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
    domain_key: z.string().nullable().optional(),
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

    const authResult = await getAuthSession();
    if (!authResult.success) {
      return apiErrors.unauthorized();
    }
    const session = authResult.session;

    const workspaceResult = await sql`
      SELECT id FROM "workspaces"
      WHERE slug = ${workspaceslug}
      AND "deletedAt" IS NULL
      AND (
        "userId" = ${session.user.id}
        OR EXISTS (
          SELECT 1 FROM "members" m
          WHERE m."workspaceId" = "workspaces".id
            AND m."userId" = ${session.user.id}
        )
      )
    `;

    if (workspaceResult.length === 0) {
      return apiErrors.notFound("Workspace not found");
    }

    const workspaceId = workspaceResult[0].id as string;

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
      date_range: props.timePeriod,
      slug: props.slug_key || "",
      url: props.destination_key || "",
      country: props.country_key || "",
      city: props.city_key || "",
      continent: props.continent_key || "",
      browser: props.browser_key || "",
      os: props.os_key || "",
      referer: props.referrer_key || "",
      device: props.device_key || "",
      domain: props.domain_key || "",
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
        "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
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
