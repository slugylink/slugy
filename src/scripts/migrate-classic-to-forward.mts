/**
 * One-shot: copy Classic Tinybird analytics data into Forward.
 *
 * Requires:
 *   TINYBIRD_CLASSIC_TOKEN  — Classic admin/read token
 *   TINYBIRD_TOKEN          — Forward workspace token
 *   TINYBIRD_URL            — e.g. https://api.us-east.aws.tinybird.co
 *
 * Usage: npx tsx src/scripts/migrate-classic-to-forward.mts
 */

import { config } from "dotenv";

config({ path: ".env" });

const BATCH = 2_000;
const classicToken = process.env.TINYBIRD_CLASSIC_TOKEN;
const forwardToken = process.env.TINYBIRD_TOKEN;
const baseUrl = (
  process.env.TINYBIRD_URL ?? "https://api.us-east.aws.tinybird.co"
).replace(/\/$/, "");

if (!classicToken) {
  console.error("Missing TINYBIRD_CLASSIC_TOKEN");
  process.exit(1);
}
if (!forwardToken) {
  console.error("Missing TINYBIRD_TOKEN");
  process.exit(1);
}

type JsonRow = Record<string, unknown>;

async function classicSql(q: string): Promise<JsonRow[]> {
  const res = await fetch(`${baseUrl}/v0/sql?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${classicToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Classic SQL ${res.status}: ${text.slice(0, 500)}`);
  }
  const body = JSON.parse(text) as { data?: JsonRow[] };
  return body.data ?? [];
}

async function forwardSql(q: string): Promise<JsonRow[]> {
  const res = await fetch(`${baseUrl}/v0/sql?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${forwardToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Forward SQL ${res.status}: ${text.slice(0, 500)}`);
  }
  const body = JSON.parse(text) as { data?: JsonRow[] };
  return body.data ?? [];
}

async function ingestBatch(
  datasource: string,
  rows: JsonRow[],
  wait = true,
): Promise<void> {
  if (rows.length === 0) return;

  const body = rows.map((r) => JSON.stringify(r)).join("\n");
  const res = await fetch(
    `${baseUrl}/v0/events?name=${encodeURIComponent(datasource)}&wait=${wait}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${forwardToken}`,
        "Content-Type": "application/x-ndjson",
      },
      body,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Ingest ${datasource} failed ${res.status}: ${text.slice(0, 500)}`,
    );
  }

  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as {
      successful_rows?: number;
      quarantined_rows?: number;
    };
    if ((parsed.quarantined_rows ?? 0) > 0) {
      console.warn(
        `  quarantined ${parsed.quarantined_rows} in ${datasource}`,
      );
    }
  } catch {
    // ignore non-JSON responses
  }
}

async function countClassic(table: string): Promise<number> {
  const rows = await classicSql(
    `SELECT count() AS c FROM ${table} FORMAT JSON`,
  );
  return Number(rows[0]?.c ?? 0);
}

async function countForward(table: string): Promise<number> {
  const rows = await forwardSql(
    `SELECT count() AS c FROM ${table} FORMAT JSON`,
  );
  return Number(rows[0]?.c ?? 0);
}

/** OFFSET pagination — avoids skipping rows that share the same cursor keys. */
async function copyTable(opts: {
  source: string;
  dest: string;
  orderBy: string;
  expected: number;
  skip?: boolean;
}): Promise<void> {
  if (opts.skip) {
    console.log(`\n↷ Skipping ${opts.source} (already migrated)`);
    return;
  }

  console.log(
    `\n→ Copying ${opts.source} → ${opts.dest} (expect ~${opts.expected})`,
  );

  let copied = 0;
  let offset = 0;

  while (true) {
    const q = `
      SELECT *
      FROM ${opts.source}
      ORDER BY ${opts.orderBy}
      LIMIT ${BATCH}
      OFFSET ${offset}
      FORMAT JSON
    `;

    const rows = await classicSql(q);
    if (rows.length === 0) break;

    await ingestBatch(opts.dest, rows, true);
    copied += rows.length;
    offset += rows.length;

    console.log(`  … ${copied} / ${opts.expected}`);

    if (rows.length < BATCH) break;
  }

  console.log(`✓ ${opts.dest}: ingested ${copied} rows`);
}

async function main() {
  console.log("Classic → Forward migration");
  console.log(`API: ${baseUrl}`);

  const classicClicks = await countClassic("slugy_click_events");
  const classicMeta = await countClassic("slugy_links_metadata");
  console.log(`Classic clicks: ${classicClicks}`);
  console.log(`Classic metadata: ${classicMeta}`);

  const forwardClicksBefore = await countForward("slugy_click_events");
  if (forwardClicksBefore > 0) {
    console.warn(
      `⚠ Forward already has ${forwardClicksBefore} clicks — continuing (may duplicate if re-run)`,
    );
  }

  const forwardMetaBefore = await countForward("slugy_links_metadata");
  const skipMeta =
    process.env.MIGRATE_SKIP_METADATA === "1" ||
    forwardMetaBefore >= classicMeta;

  await copyTable({
    source: "slugy_links_metadata",
    dest: "slugy_links_metadata",
    orderBy: "timestamp ASC, link_id ASC",
    expected: classicMeta,
    skip: skipMeta,
  });

  await copyTable({
    source: "slugy_click_events",
    dest: "slugy_click_events",
    orderBy: "timestamp ASC, link_id ASC, ip ASC, ua ASC",
    expected: classicClicks,
  });

  // Poll until Forward counts stabilize (Events API can lag briefly)
  let fwdClicks = 0;
  let fwdClicksMv = 0;
  let fwdMeta = 0;
  let fwdMetaLatest = 0;
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    fwdClicks = await countForward("slugy_click_events");
    fwdClicksMv = await countForward("slugy_click_events_mv");
    fwdMeta = await countForward("slugy_links_metadata");
    fwdMetaLatest = await countForward("slugy_links_metadata_latest");
    console.log(
      `  poll ${i + 1}: clicks=${fwdClicks} mv=${fwdClicksMv} meta=${fwdMeta} latest=${fwdMetaLatest}`,
    );
    if (fwdClicks >= classicClicks && fwdClicksMv >= classicClicks) break;
  }

  console.log("\n=== Verification ===");
  console.log(`clicks:          classic ${classicClicks} → forward ${fwdClicks}`);
  console.log(`clicks_mv:       forward ${fwdClicksMv}`);
  console.log(`metadata:        classic ${classicMeta} → forward ${fwdMeta}`);
  console.log(`metadata_latest: forward ${fwdMetaLatest}`);

  if (fwdClicks < classicClicks) {
    console.error("✗ Forward click count lower than Classic — investigate");
    process.exit(1);
  }
  if (fwdClicksMv < classicClicks * 0.99) {
    console.error(
      "✗ clicks_mv lagging — analytics_pipe may under-count; wait and recheck",
    );
    process.exit(1);
  }
  if (fwdMetaLatest === 0 && fwdMeta > 0) {
    console.error(
      "✗ metadata_latest empty — analytics_pipe join will fail; may need MV backfill",
    );
    process.exit(1);
  }

  console.log("\n✓ Migration complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
