# Analytics Split Demo

This file shows how to replace one wide `get_analytics.pipe` query with narrower
queries that scale better.

## Why split it

The current pipe groups by:

- `link_id`
- `day`
- `slug`
- `url`
- `domain`
- `country`
- `city`
- `continent`
- `device`
- `browser`
- `os`
- `referer`

That is expensive because one request computes every dimension at once, even if
the UI only needs one chart or one table.

## Pattern 1: Separate time-series pipe

Use this when the UI only needs `clicksOverTime` and `totalClicks`.

```sql
%WITH
    now() AS current_ts,
    {{ String(date_range, "7d", required=False) }} AS dr,
    CASE
        WHEN dr = '24h' THEN current_ts - INTERVAL 24 HOUR
        WHEN dr = '7d' THEN current_ts - INTERVAL 7 DAY
        WHEN dr = '30d' THEN current_ts - INTERVAL 30 DAY
        WHEN dr = '3m' THEN current_ts - INTERVAL 90 DAY
        WHEN dr = '12m' THEN current_ts - INTERVAL 365 DAY
        WHEN dr = 'all' THEN toDateTime('2025-01-01 00:00:00')
        ELSE current_ts - INTERVAL 7 DAY
    END AS start_ts,
    {{ String(slug, "", required=False) }} AS slug_filter
SELECT
    CASE
        WHEN dr = '24h' THEN toString(toStartOfHour(ev.timestamp))
        ELSE toString(toDate(ev.timestamp))
    END AS bucket,
    count() AS clicks
FROM slugy_click_events_mv AS ev
INNER JOIN slugy_links_metadata_latest AS meta
    ON ev.link_id = meta.link_id
   AND ev.workspace_id = meta.workspace_id
WHERE
    ev.workspace_id = {{ String(workspace_id, "", required=True) }}
    AND ev.timestamp >= start_ts
    AND meta.deleted = 0
    AND (slug_filter = '' OR meta.slug = slug_filter)
GROUP BY bucket
ORDER BY bucket ASC
```

Why it is cheaper:

- no grouping by `country`, `city`, `browser`, `os`, or `referer`
- output cardinality is bounded by number of buckets

## Pattern 2: Separate dimension pipe

Use this when the UI needs one ranked table, for example `countries`.

```sql
%WITH
    now() AS current_ts,
    {{ String(date_range, "7d", required=False) }} AS dr,
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
    ev.country,
    count() AS clicks
FROM slugy_click_events_mv AS ev
INNER JOIN slugy_links_metadata_latest AS meta
    ON ev.link_id = meta.link_id
   AND ev.workspace_id = meta.workspace_id
WHERE
    ev.workspace_id = {{ String(workspace_id, "", required=True) }}
    AND ev.timestamp >= start_ts
    AND meta.deleted = 0
GROUP BY ev.country
ORDER BY clicks DESC
LIMIT 100
```

You would create similar narrow pipes for:

- `cities`
- `continents`
- `devices`
- `browsers`
- `oses`
- `referrers`
- `destinations`

## Pattern 3: Pre-aggregated daily datasource

If the time-series query becomes hot, pre-aggregate by day instead of scanning
raw click rows every time.

### Pipe for the aggregated datasource

```sql
SELECT
    toDate(timestamp) AS day,
    workspace_id,
    link_id,
    country,
    city,
    continent,
    device,
    browser,
    os,
    referer,
    count() AS clicks
FROM slugy_click_events
GROUP BY
    day,
    workspace_id,
    link_id,
    country,
    city,
    continent,
    device,
    browser,
    os,
    referer
```

### Datasource shape

```sql
SCHEMA >
    `day` Date,
    `workspace_id` String,
    `link_id` String,
    `country` LowCardinality(String),
    `city` String,
    `continent` LowCardinality(String),
    `device` LowCardinality(String),
    `browser` LowCardinality(String),
    `os` LowCardinality(String),
    `referer` String,
    `clicks` UInt64

ENGINE "SummingMergeTree"
ENGINE_PARTITION_KEY "toYYYYMM(day)"
ENGINE_SORTING_KEY "workspace_id, day, link_id"
```

Then your chart query becomes a sum over pre-counted rows instead of a count over
raw events.

## Practical rollout

If you want minimal disruption, do it in this order:

1. Keep `get_analytics.pipe` for compatibility.
2. Add a dedicated `get_analytics_timeseries.pipe`.
3. Add one dedicated dimension pipe, usually `get_analytics_countries.pipe`.
4. Update the UI to call the narrow pipe for that one card.
5. Repeat for the other cards.
6. Add pre-aggregated datasources only for the hottest endpoints.

## What not to do

- Do not create one pipe that still groups by every dimension and only returns a subset.
- Do not add `FINAL` unless you have confirmed you need it for correctness.
- Do not optimize only the SQL syntax if the query shape is still wide.
