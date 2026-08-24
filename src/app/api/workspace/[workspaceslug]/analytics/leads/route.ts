import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/server/db";
import { apiErrors } from "@/lib/api-response";
import { getStartDate } from "@/server/actions/analytics/analytics";
import { getWorkspaceAccess } from "@/lib/workspace-access";

type TimePeriod = "24h" | "7d" | "30d" | "3m" | "12m" | "all";

const schema = z.object({
  timePeriod: z.enum(["24h", "7d", "30d", "3m", "12m", "all"]).default("24h"),
  slug_key: z.string().nullable().optional(),
});

function bucketKey(date: Date, timePeriod: TimePeriod): string {
  const d = new Date(date);
  if (timePeriod === "24h") {
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  }
  if (timePeriod === "7d" || timePeriod === "30d") {
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0]!;
  }
  // 3m / 12m / all → month buckets
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const auth = await getAuthSession();
    if (!auth.success) {
      return apiErrors.unauthorized();
    }

    const { workspaceslug } = await params;
    const access = await getWorkspaceAccess(
      auth.session.user.id,
      workspaceslug,
    );
    if (!access.success || !access.workspace) {
      return apiErrors.forbidden();
    }

    const url = new URL(req.url);
    const parsed = schema.safeParse({
      timePeriod: url.searchParams.get("time_period") ?? "24h",
      slug_key: url.searchParams.get("slug_key"),
    });
    if (!parsed.success) {
      return apiErrors.validationError(
        parsed.error.errors,
        "Invalid parameters",
      );
    }

    const { timePeriod, slug_key } = parsed.data;
    const workspaceId = access.workspace.id;
    const startDate = getStartDate(timePeriod);

    const where = {
      workspaceId,
      type: "lead" as const,
      ...(timePeriod !== "all" ? { createdAt: { gte: startDate } } : {}),
      ...(slug_key ? { link: { slug: slug_key } } : {}),
    };

    const events = await db.conversionEvent.findMany({
      where,
      select: {
        id: true,
        eventName: true,
        createdAt: true,
        link: {
          select: {
            slug: true,
            url: true,
            domain: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50_000,
    });

    const totalLeads = events.length;
    const timeMap = new Map<string, number>();
    const linksMap = new Map<
      string,
      { slug: string; url: string; domain: string; leads: number }
    >();
    const eventsMap = new Map<string, number>();

    for (const event of events) {
      const key = bucketKey(event.createdAt, timePeriod);
      timeMap.set(key, (timeMap.get(key) ?? 0) + 1);

      const linkKey = `${event.link.domain}/${event.link.slug}`;
      const existing = linksMap.get(linkKey);
      if (existing) {
        existing.leads += 1;
      } else {
        linksMap.set(linkKey, {
          slug: event.link.slug,
          url: event.link.url,
          domain: event.link.domain,
          leads: 1,
        });
      }

      eventsMap.set(event.eventName, (eventsMap.get(event.eventName) ?? 0) + 1);
    }

    const leadsOverTime = Array.from(timeMap.entries())
      .map(([time, clicks]) => ({ time, clicks }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const links = Array.from(linksMap.values())
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 50)
      .map((l) => ({
        slug: l.slug,
        url: l.url,
        domain: l.domain,
        clicks: l.leads, // cards expect clicks
        leads: l.leads,
      }));

    const eventNames = Array.from(eventsMap.entries())
      .map(([eventName, leads]) => ({ eventName, clicks: leads, leads }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 50);

    return NextResponse.json(
      {
        totalLeads,
        leadsOverTime,
        links,
        eventNames,
      },
      {
        headers: {
          "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("[leads analytics]", error);
    return apiErrors.internalError("Failed to load leads analytics");
  }
}
