/**
 * Escape a value for use as a ClickHouse/Tinybird string literal.
 * Only allows safe printable chars after quote escaping.
 */
export function escapeTinybirdString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Analytics aggregation SQL with FINAL on metadata so ReplacingMergeTree
 * duplicates never multiply click counts via INNER JOIN.
 */
export function buildAnalyticsSql(params: {
  workspaceId: string;
  dateRange: string;
  slug: string;
  url: string;
  country: string;
  city: string;
  continent: string;
  browser: string;
  os: string;
  referer: string;
  device: string;
  domain: string;
}): string {
  const workspaceId = escapeTinybirdString(params.workspaceId);
  const dateRange = escapeTinybirdString(params.dateRange);
  const slug = escapeTinybirdString(params.slug);
  const url = escapeTinybirdString(params.url);
  const country = escapeTinybirdString(params.country);
  const city = escapeTinybirdString(params.city);
  const continent = escapeTinybirdString(params.continent);
  const browser = escapeTinybirdString(params.browser);
  const os = escapeTinybirdString(params.os);
  const referer = escapeTinybirdString(params.referer);
  const device = escapeTinybirdString(params.device);
  const domain = escapeTinybirdString(params.domain);

  return `
WITH
    now() AS current_ts,
    '${dateRange}' AS dr,
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
    meta.slug AS slug,
    meta.url AS url,
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
    ev.workspace_id = '${workspaceId}'
    AND ev.timestamp >= start_ts
    AND meta.deleted = 0
    AND ('${slug}' = '' OR meta.slug = '${slug}')
    AND ('${url}' = '' OR meta.url = '${url}')
    AND ('${domain}' = '' OR ev.domain = '${domain}')
    AND ('${country}' = '' OR ev.country = '${country}')
    AND ('${city}' = '' OR ev.city = '${city}')
    AND ('${continent}' = '' OR ev.continent = '${continent}')
    AND ('${device}' = '' OR ev.device = '${device}')
    AND ('${browser}' = '' OR ev.browser = '${browser}')
    AND ('${os}' = '' OR ev.os = '${os}')
    AND ('${referer}' = '' OR ev.referer = '${referer}')
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
`.trim();
}
