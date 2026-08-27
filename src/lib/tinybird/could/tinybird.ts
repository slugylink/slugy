/**
 * Tinybird Forward — Slugy analytics resources
 *
 * Clicks:  slugy_click_events (+ MV) → analytics_pipe
 * Links:   slugy_links_metadata (+ latest MV)
 * Leads:   slugy_lead_events → leads_analytics
 */

import {
  defineDatasource,
  defineEndpoint,
  defineMaterializedView,
  Tinybird,
  node,
  t,
  p,
  engine,
  type InferRow,
  type InferParams,
  type InferOutputRow,
} from "@tinybirdco/sdk";

// ============================================================================
// Datasources — clicks
// ============================================================================

export const slugyClickEvents = defineDatasource("slugy_click_events", {
  description: "Raw Slugy link click events",
  schema: {
    timestamp: t.dateTime64(3),
    link_id: t.string(),
    workspace_id: t.string(),
    click_id: t.string().nullable(),
    slug: t.string().lowCardinality(),
    url: t.string().lowCardinality(),
    domain: t.string().lowCardinality(),
    ip: t.string(),
    country: t.string().lowCardinality(),
    city: t.string(),
    continent: t.string().lowCardinality(),
    device: t.string().lowCardinality(),
    browser: t.string().lowCardinality(),
    os: t.string().lowCardinality(),
    ua: t.string(),
    referer: t.string(),
    trigger: t.string().nullable(),
    user_id: t.string().nullable(),
    utm_source: t.string().lowCardinality(),
    utm_medium: t.string().lowCardinality(),
    utm_campaign: t.string().lowCardinality(),
    utm_term: t.string().lowCardinality(),
    utm_content: t.string().lowCardinality(),
  },
  engine: engine.mergeTree({
    sortingKey: ["timestamp", "link_id", "workspace_id"],
    partitionKey: "toYYYYMM(timestamp)",
  }),
});

export type SlugyClickEventsRow = InferRow<typeof slugyClickEvents>;

export const slugyClickEventsMv = defineDatasource("slugy_click_events_mv", {
  description: "Projected click events for analytics joins",
  schema: {
    timestamp: t.dateTime64(3),
    workspace_id: t.string(),
    link_id: t.string(),
    slug: t.string().lowCardinality(),
    url: t.string().lowCardinality(),
    domain: t.string().lowCardinality(),
    country: t.string().lowCardinality(),
    city: t.string(),
    continent: t.string().lowCardinality(),
    device: t.string().lowCardinality(),
    browser: t.string().lowCardinality(),
    os: t.string().lowCardinality(),
    referer: t.string(),
  },
  engine: engine.mergeTree({
    sortingKey: ["link_id"],
    partitionKey: "toYYYYMM(timestamp)",
  }),
});

export const slugyClickEventsMvPipe = defineMaterializedView(
  "slugy_click_events_pipe",
  {
    description: "Materialize click projection for analytics_pipe",
    datasource: slugyClickEventsMv,
    nodes: [
      node({
        name: "mv",
        sql: `
          SELECT
            timestamp,
            workspace_id,
            link_id,
            slug,
            url,
            domain,
            country,
            city,
            continent,
            device,
            browser,
            os,
            referer
          FROM slugy_click_events
        `,
      }),
    ],
  },
);

// ============================================================================
// Datasources — link metadata
// ============================================================================

export const slugyLinksMetadata = defineDatasource("slugy_links_metadata", {
  description: "Append-only Slugy link metadata versions",
  schema: {
    link_id: t.string(),
    domain: t.string(),
    slug: t.string(),
    url: t.string(),
    tag_ids: t.array(t.string()).jsonPath("$.tag_ids[:]"),
    workspace_id: t.string(),
    created_at: t.dateTime64(3),
    deleted: t.uint8(),
    timestamp: t.dateTime(),
  },
  engine: engine.mergeTree({
    sortingKey: ["timestamp", "link_id", "workspace_id"],
    partitionKey: "toYear(timestamp)",
  }),
});

export type SlugyLinksMetadataRow = InferRow<typeof slugyLinksMetadata>;

export const slugyLinksMetadataLatest = defineDatasource(
  "slugy_links_metadata_latest",
  {
    description: "Latest link metadata per link_id (ReplacingMergeTree)",
    schema: {
      link_id: t.string(),
      domain: t.string(),
      slug: t.string(),
      url: t.string(),
      tag_ids: t.array(t.string()).jsonPath("$.tag_ids[:]"),
      workspace_id: t.string(),
      created_at: t.dateTime64(3),
      deleted: t.uint8(),
      timestamp: t.dateTime(),
    },
    engine: engine.replacingMergeTree({
      sortingKey: ["link_id"],
      ver: "timestamp",
      partitionKey: "toYYYYMM(timestamp)",
    }),
  },
);

export const slugyLinksMetadataMvPipe = defineMaterializedView(
  "slugy_links_metadata_pipe",
  {
    description: "Materialize latest link metadata",
    datasource: slugyLinksMetadataLatest,
    nodes: [
      node({
        name: "mv",
        sql: `SELECT * FROM slugy_links_metadata`,
      }),
    ],
  },
);

// ============================================================================
// Datasources — leads
// ============================================================================

export const slugyLeadEvents = defineDatasource("slugy_lead_events", {
  description: "Lead conversion events attributed to Slugy link clicks",
  schema: {
    timestamp: t.dateTime64(3),
    workspace_id: t.string(),
    link_id: t.string(),
    click_id: t.string(),
    slug: t.string().lowCardinality(),
    url: t.string().lowCardinality(),
    domain: t.string().lowCardinality(),
    event_name: t.string().lowCardinality(),
    customer_external_id: t.string(),
    country: t.string().lowCardinality(),
    city: t.string(),
    continent: t.string().lowCardinality(),
    device: t.string().lowCardinality(),
    browser: t.string().lowCardinality(),
    os: t.string().lowCardinality(),
    referer: t.string(),
  },
  engine: engine.mergeTree({
    sortingKey: ["timestamp", "link_id", "workspace_id"],
    partitionKey: "toYYYYMM(timestamp)",
  }),
});

export type SlugyLeadEventsRow = InferRow<typeof slugyLeadEvents>;

// ============================================================================
// Shared analytics output shape
// ============================================================================

const analyticsOutput = {
  link_id: t.string(),
  day: t.string(),
  clicks: t.uint64(),
  "meta.slug": t.string(),
  "meta.url": t.string(),
  domain: t.string(),
  country: t.string(),
  city: t.string(),
  continent: t.string(),
  device: t.string(),
  browser: t.string(),
  os: t.string(),
  referer: t.string(),
} as const;

const analyticsParams = {
  workspace_id: p.string(),
  date_range: p.string().optional("24h"),
  slug: p.string().optional(""),
  url: p.string().optional(""),
  domain: p.string().optional(""),
  country: p.string().optional(""),
  city: p.string().optional(""),
  continent: p.string().optional(""),
  device: p.string().optional(""),
  browser: p.string().optional(""),
  os: p.string().optional(""),
  referer: p.string().optional(""),
} as const;

// ============================================================================
// Endpoints
// ============================================================================

export const analyticsPipe = defineEndpoint("analytics_pipe", {
  description: "Aggregated click analytics by dimension",
  params: analyticsParams,
  nodes: [
    node({
      name: "endpoint",
      sql: `
        WITH
          now() AS current_ts,
          {{String(date_range, '24h')}} AS dr,
          CASE
            WHEN dr = '24h' THEN current_ts - INTERVAL 24 HOUR
            WHEN dr = '7d' THEN current_ts - INTERVAL 7 DAY
            WHEN dr = '30d' THEN current_ts - INTERVAL 30 DAY
            WHEN dr = '3m' THEN current_ts - INTERVAL 90 DAY
            WHEN dr = '12m' THEN current_ts - INTERVAL 365 DAY
            WHEN dr = 'all' THEN toDateTime('2025-01-01 00:00:00')
            ELSE current_ts - INTERVAL 7 DAY
          END AS start_ts
        SELECT
          ev.link_id,
          CASE
            WHEN dr = '24h' THEN toString(toStartOfHour(ev.timestamp))
            ELSE toString(toDate(ev.timestamp))
          END AS day,
          count() AS clicks,
          meta.slug AS \`meta.slug\`,
          meta.url AS \`meta.url\`,
          ev.domain,
          ev.country,
          ev.city,
          ev.continent,
          ev.device,
          ev.browser,
          ev.os,
          ev.referer
        FROM slugy_click_events_mv AS ev
        INNER JOIN (
          SELECT
            link_id,
            workspace_id,
            slug,
            url,
            deleted
          FROM slugy_links_metadata_latest
          FINAL
        ) AS meta
          ON ev.link_id = meta.link_id
         AND ev.workspace_id = meta.workspace_id
        WHERE
          ev.workspace_id = {{String(workspace_id)}}
          AND ev.timestamp >= start_ts
          AND meta.deleted = 0
          AND ({{String(slug, '')}} = '' OR meta.slug = {{String(slug, '')}})
          AND ({{String(url, '')}} = '' OR meta.url = {{String(url, '')}})
          AND ({{String(domain, '')}} = '' OR ev.domain = {{String(domain, '')}})
          AND ({{String(country, '')}} = '' OR ev.country = {{String(country, '')}})
          AND ({{String(city, '')}} = '' OR ev.city = {{String(city, '')}})
          AND ({{String(continent, '')}} = '' OR ev.continent = {{String(continent, '')}})
          AND ({{String(device, '')}} = '' OR ev.device = {{String(device, '')}})
          AND ({{String(browser, '')}} = '' OR ev.browser = {{String(browser, '')}})
          AND ({{String(os, '')}} = '' OR ev.os = {{String(os, '')}})
          AND ({{String(referer, '')}} = '' OR ev.referer = {{String(referer, '')}})
        GROUP BY
          ev.link_id,
          meta.slug,
          meta.url,
          ev.domain,
          day,
          ev.country,
          ev.city,
          ev.continent,
          ev.device,
          ev.browser,
          ev.os,
          ev.referer
        ORDER BY day DESC, clicks DESC
      `,
    }),
  ],
  output: analyticsOutput,
});

export type AnalyticsPipeParams = InferParams<typeof analyticsPipe>;
export type AnalyticsPipeOutput = InferOutputRow<typeof analyticsPipe>;

export const leadsAnalytics = defineEndpoint("leads_analytics", {
  description: "Aggregated lead conversion analytics by dimension",
  params: analyticsParams,
  nodes: [
    node({
      name: "endpoint",
      sql: `
        WITH
          now() AS current_ts,
          {{String(date_range, '24h')}} AS dr,
          CASE
            WHEN dr = '24h' THEN current_ts - INTERVAL 24 HOUR
            WHEN dr = '7d' THEN current_ts - INTERVAL 7 DAY
            WHEN dr = '30d' THEN current_ts - INTERVAL 30 DAY
            WHEN dr = '3m' THEN current_ts - INTERVAL 90 DAY
            WHEN dr = '12m' THEN current_ts - INTERVAL 365 DAY
            WHEN dr = 'all' THEN toDateTime('2025-01-01 00:00:00')
            ELSE current_ts - INTERVAL 7 DAY
          END AS start_ts
        SELECT
          link_id,
          CASE
            WHEN dr = '24h' THEN toString(toStartOfHour(timestamp))
            ELSE toString(toDate(timestamp))
          END AS day,
          count() AS clicks,
          any(slug) AS \`meta.slug\`,
          any(url) AS \`meta.url\`,
          domain,
          country,
          city,
          continent,
          device,
          browser,
          os,
          referer
        FROM slugy_lead_events
        WHERE
          workspace_id = {{String(workspace_id)}}
          AND timestamp >= start_ts
          AND ({{String(slug, '')}} = '' OR slug = {{String(slug, '')}})
          AND ({{String(url, '')}} = '' OR url = {{String(url, '')}})
          AND ({{String(domain, '')}} = '' OR domain = {{String(domain, '')}})
          AND ({{String(country, '')}} = '' OR country = {{String(country, '')}})
          AND ({{String(city, '')}} = '' OR city = {{String(city, '')}})
          AND ({{String(continent, '')}} = '' OR continent = {{String(continent, '')}})
          AND ({{String(device, '')}} = '' OR device = {{String(device, '')}})
          AND ({{String(browser, '')}} = '' OR browser = {{String(browser, '')}})
          AND ({{String(os, '')}} = '' OR os = {{String(os, '')}})
          AND ({{String(referer, '')}} = '' OR referer = {{String(referer, '')}})
        GROUP BY
          link_id,
          day,
          domain,
          country,
          city,
          continent,
          device,
          browser,
          os,
          referer
        ORDER BY day DESC, clicks DESC
      `,
    }),
  ],
  output: analyticsOutput,
});

export type LeadsAnalyticsParams = InferParams<typeof leadsAnalytics>;
export type LeadsAnalyticsOutput = InferOutputRow<typeof leadsAnalytics>;

// ============================================================================
// Client
// ============================================================================

export const tinybird = new Tinybird({
  token: process.env.TINYBIRD_TOKEN ?? process.env.TINYBIRD_API_KEY,
  baseUrl: process.env.TINYBIRD_URL ?? "https://api.us-east.aws.tinybird.co",
  // Match HTTP ingest (main workspace). SDK default in development uses a git branch.
  devMode: false,
  datasources: {
    slugyClickEvents,
    slugyClickEventsMv,
    slugyLinksMetadata,
    slugyLinksMetadataLatest,
    slugyLeadEvents,
  },
  pipes: {
    slugyClickEventsMvPipe,
    slugyLinksMetadataMvPipe,
    analyticsPipe,
    leadsAnalytics,
  },
});
