import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  aggregateRedisEvents,
  getEventsForWorkspaceId,
} from "@/lib/cache-utils/redis-analytics";
import type { RedisAnalyticsEvent } from "@/lib/cache-utils/redis-analytics";
import { sql } from "@/server/neon";

// Only supports 24h period, no TTL, we trim on write
const analyticsPropsSchema = z
  .object({
    time_period: z.literal("24h").optional().default("24h"),
    slug_key: z.string().nullable().optional(),
    country_key: z.string().nullable().optional(),
    city_key: z.string().nullable().optional(),
    continent_key: z.string().nullable().optional(),
    browser_key: z.string().nullable().optional(),
    os_key: z.string().nullable().optional(),
    referrer_key: z.string().nullable().optional(),
    device_key: z.string().nullable().optional(),
    destination_key: z.string().nullable().optional(),
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
          "oses",
          "referrers",
          "destinations",
        ]),
      )
      .optional(),
  })
  .strict();

type FilterableEvent = {
  slug?: string;
  url?: string;
  country?: string;
  city?: string;
  continent?: string;
  browser?: string;
  os?: string;
  referer?: string;
  device?: string;
};

function filterEvents<T extends FilterableEvent>(
  events: T[],
  filters: Record<string, string>,
): T[] {
  const normalized = Object.fromEntries(
    Object.entries(filters).map(([k, v]) => [
      k.replace(/_key$/, ""),
      v.trim().toLowerCase(),
    ]),
  );
  return events.filter((e) => {
    return Object.entries(normalized).every(([k, v]) => {
      if (!v) return true;
      const field =
        k === "destination"
          ? (e as FilterableEvent)["url"]
          : (e as FilterableEvent)[k as keyof FilterableEvent];
      if (field == null) return false;
      return String(field).toLowerCase() === v;
    });
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const { workspaceslug } = await params;
    const search = new URL(req.url).searchParams;

    const raw = {
      time_period: search.get("time_period") ?? "24h",
      slug_key: search.get("slug_key"),
      country_key: search.get("country_key"),
      city_key: search.get("city_key"),
      continent_key: search.get("continent_key"),
      browser_key: search.get("browser_key"),
      os_key: search.get("os_key"),
      referrer_key: search.get("referrer_key"),
      device_key: search.get("device_key"),
      destination_key: search.get("destination_key"),
      metrics: search.get("metrics")?.split(","),
    } as Record<string, string | string[] | null>;

    const props = analyticsPropsSchema.parse(raw);

    // resolve workspace id from slug
    const ws = await sql`
      SELECT id FROM "workspaces" WHERE slug = ${workspaceslug} LIMIT 1
    `;
    const workspaceId: string | undefined = ws?.[0]?.id;
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const toTs = Date.now();
    const fromTs = toTs - 24 * 60 * 60 * 1000;

    // Read raw events from Redis for 24h
    const events: RedisAnalyticsEvent[] = await getEventsForWorkspaceId(
      workspaceId,
      fromTs,
      toTs,
    );

    // Apply request filters to raw events first
    const filtered = filterEvents<RedisAnalyticsEvent>(events, {
      slug_key: props.slug_key ?? "",
      destination_key: props.destination_key ?? "",
      country_key: props.country_key ?? "",
      city_key: props.city_key ?? "",
      continent_key: props.continent_key ?? "",
      browser_key: props.browser_key ?? "",
      os_key: props.os_key ?? "",
      referrer_key: props.referrer_key ?? "",
      device_key: props.device_key ?? "",
    });

    const agg = aggregateRedisEvents(filtered);

    type RequestedMetric =
      | "totalClicks"
      | "clicksOverTime"
      | "links"
      | "cities"
      | "countries"
      | "continents"
      | "devices"
      | "browsers"
      | "oses"
      | "referrers"
      | "destinations";

    const requested: RequestedMetric[] = (props.metrics as
      | RequestedMetric[]
      | undefined) ?? [
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

    const body: Record<string, unknown> = {};
    for (const m of requested) {
      switch (m) {
        case "totalClicks":
          body[m] = agg.totalClicks;
          break;
        case "clicksOverTime":
          body[m] = agg.clicksOverTime;
          break;
        case "links":
          body[m] = agg.links;
          break;
        case "cities":
          body[m] = agg.cities;
          break;
        case "countries":
          body[m] = agg.countries;
          break;
        case "continents":
          body[m] = agg.continents;
          break;
        case "devices":
          body[m] = agg.devices;
          break;
        case "browsers":
          body[m] = agg.browsers;
          break;
        case "oses":
          body[m] = agg.oses;
          break;
        case "referrers":
          body[m] = agg.referrers;
          break;
        case "destinations":
          body[m] = agg.destinations;
          break;
      }
    }

    const res = NextResponse.json(body);
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    res.headers.set("X-Analytics-Source", "redis-24h");
    return res;
  } catch (err) {
    console.error("Redis analytics GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
