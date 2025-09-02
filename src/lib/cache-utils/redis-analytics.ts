import { redis } from "../redis";

export interface RedisAnalyticsEvent {
  ts: number;
  workspaceId: string;
  workspaceslug?: string;
  linkId: string;
  slug: string;
  url: string;
  ip?: string;
  country?: string;
  city?: string;
  continent?: string;
  device?: string;
  browser?: string;
  os?: string;
  referer?: string;
}

function zsetKeyByWorkspaceId(workspaceId: string): string {
  return `analytics:zset:ws:${workspaceId}`;
}

function zsetKeyByWorkspaceSlug(workspaceslug: string): string {
  return `analytics:zset:wslug:${workspaceslug}`;
}

export async function recordAnalyticsEvent(
  event: RedisAnalyticsEvent,
): Promise<void> {
  try {
    const score = event.ts;
    const payload = JSON.stringify(event);
    const p = redis.pipeline();
    p.zadd(zsetKeyByWorkspaceId(event.workspaceId), { score, member: payload });
    if (event.workspaceslug) {
      p.zadd(zsetKeyByWorkspaceSlug(event.workspaceslug), {
        score,
        member: payload,
      });
    }
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    p.zremrangebyscore(zsetKeyByWorkspaceId(event.workspaceId), 0, cutoff);
    if (event.workspaceslug) {
      p.zremrangebyscore(
        zsetKeyByWorkspaceSlug(event.workspaceslug),
        0,
        cutoff,
      );
    }
    await p.exec();
  } catch (err) {
    console.warn("Failed to record analytics to Redis:", err);
  }
}

export async function getEventsForWorkspaceId(
  workspaceId: string,
  fromTs: number,
  toTs: number,
): Promise<RedisAnalyticsEvent[]> {
  try {
    const raw = await redis.zrange(
      zsetKeyByWorkspaceId(workspaceId),
      fromTs,
      toTs,
      { byScore: true },
    );
    const items = raw as unknown as Array<
      string | { member: string; score: number } | RedisAnalyticsEvent
    >;
    const events: RedisAnalyticsEvent[] = [];
    for (const item of items) {
      if (typeof item === "string") {
        try {
          events.push(JSON.parse(item) as RedisAnalyticsEvent);
        } catch {
          // ignore malformed
        }
      } else if (item && typeof item === "object") {
        if (
          "member" in item &&
          typeof (item as { member: string }).member === "string"
        ) {
          try {
            events.push(
              JSON.parse(
                (item as { member: string }).member,
              ) as RedisAnalyticsEvent,
            );
          } catch {
            // ignore malformed
          }
        } else {
          // Already an event-like object
          events.push(item as RedisAnalyticsEvent);
        }
      }
    }
    return events;
  } catch (err) {
    console.warn("Failed to read analytics from Redis (id):", err);
    return [];
  }
}

export type AggregatedRedisAnalytics = {
  totalClicks: number;
  clicksOverTime: Array<{ time: Date; clicks: number }>;
  links: Array<{ slug: string; url: string; clicks: number }>;
  cities: Array<{ city: string; country: string; clicks: number }>;
  countries: Array<{ country: string; clicks: number }>;
  continents: Array<{ continent: string; clicks: number }>;
  devices: Array<{ device: string; clicks: number }>;
  browsers: Array<{ browser: string; clicks: number }>;
  oses: Array<{ os: string; clicks: number }>;
  referrers: Array<{ referrer: string; clicks: number }>;
  destinations: Array<{ destination: string; clicks: number }>;
};

export function aggregateRedisEvents(
  events: RedisAnalyticsEvent[],
): AggregatedRedisAnalytics {
  const totalClicks = events.length;

  const clicksOverTimeMap = new Map<string, number>();
  const inc = (map: Map<string, number>, key: string) =>
    map.set(key, (map.get(key) ?? 0) + 1);

  const linksMap = new Map<
    string,
    { slug: string; url: string; clicks: number }
  >();
  const citiesMap = new Map<
    string,
    { city: string; country: string; clicks: number }
  >();
  const countriesMap = new Map<string, { country: string; clicks: number }>();
  const continentsMap = new Map<
    string,
    { continent: string; clicks: number }
  >();
  const devicesMap = new Map<string, { device: string; clicks: number }>();
  const browsersMap = new Map<string, { browser: string; clicks: number }>();
  const osesMap = new Map<string, { os: string; clicks: number }>();
  const referrersMap = new Map<string, { referrer: string; clicks: number }>();
  const destinationsMap = new Map<
    string,
    { destination: string; clicks: number }
  >();

  for (const e of events) {
    const hourIso = new Date(new Date(e.ts).setMinutes(0, 0, 0)).toISOString();
    inc(clicksOverTimeMap, hourIso);

    const linkKey = `${e.slug}|${e.url}`;
    linksMap.set(linkKey, {
      slug: e.slug,
      url: e.url,
      clicks: (linksMap.get(linkKey)?.clicks ?? 0) + 1,
    });

    if (e.city || e.country) {
      const ckey = `${e.city ?? ""}|${e.country ?? ""}`;
      citiesMap.set(ckey, {
        city: e.city ?? "",
        country: e.country ?? "",
        clicks: (citiesMap.get(ckey)?.clicks ?? 0) + 1,
      });
    }

    if (e.country) {
      const ckey = e.country;
      countriesMap.set(ckey, {
        country: e.country,
        clicks: (countriesMap.get(ckey)?.clicks ?? 0) + 1,
      });
    }

    if (e.continent) {
      const ckey = e.continent;
      continentsMap.set(ckey, {
        continent: e.continent,
        clicks: (continentsMap.get(ckey)?.clicks ?? 0) + 1,
      });
    }

    if (e.device) {
      const dkey = e.device;
      devicesMap.set(dkey, {
        device: e.device,
        clicks: (devicesMap.get(dkey)?.clicks ?? 0) + 1,
      });
    }

    if (e.browser) {
      const bkey = e.browser;
      browsersMap.set(bkey, {
        browser: e.browser,
        clicks: (browsersMap.get(bkey)?.clicks ?? 0) + 1,
      });
    }

    if (e.os) {
      const okey = e.os;
      osesMap.set(okey, {
        os: e.os,
        clicks: (osesMap.get(okey)?.clicks ?? 0) + 1,
      });
    }

    if (e.referer) {
      const rkey = e.referer;
      referrersMap.set(rkey, {
        referrer: e.referer,
        clicks: (referrersMap.get(rkey)?.clicks ?? 0) + 1,
      });
    }

    if (e.url) {
      const dkey = e.url;
      destinationsMap.set(dkey, {
        destination: e.url,
        clicks: (destinationsMap.get(dkey)?.clicks ?? 0) + 1,
      });
    }
  }

  const clicksOverTime = Array.from(clicksOverTimeMap.entries())
    .map(([time, clicks]) => ({ time: new Date(time), clicks }))
    .sort((a, b) => a.time.getTime() - b.time.getTime());

  return {
    totalClicks,
    clicksOverTime,
    links: Array.from(linksMap.values()),
    cities: Array.from(citiesMap.values()),
    countries: Array.from(countriesMap.values()),
    continents: Array.from(continentsMap.values()),
    devices: Array.from(devicesMap.values()),
    browsers: Array.from(browsersMap.values()),
    oses: Array.from(osesMap.values()),
    referrers: Array.from(referrersMap.values()),
    destinations: Array.from(destinationsMap.values()),
  };
}
