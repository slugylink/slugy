/**
 * Test-only export: 30 days of slugy_click_events from Tinybird → Parquet → R2.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json src/scripts/export-clicks-to-r2-parquet.mts [--days 30]
 *
 * Reads .env (dev creds). Writes NDJSON incrementally, converts to Parquet
 * with DuckDB, uploads to CLOUDFLARE_BUCKET_NAME, and ensures bucket CORS
 * allows browser reads (needed for the DuckDB-Wasm test page).
 */
import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import duckdbPkg from "duckdb";

type DuckDBConnection = {
  exec(sql: string, cb: (err: Error | null) => void): void;
  all(sql: string, cb: (err: Error | null, rows: unknown[]) => void): void;
};

const duckdbNative = duckdbPkg as unknown as {
  Database: new (path: string) => unknown;
  Connection: new (db: unknown) => DuckDBConnection;
};
import { S3Service } from "../lib/s3-service.ts";

const CLICK_COLUMNS = [
  "timestamp",
  "link_id",
  "workspace_id",
  "click_id",
  "slug",
  "url",
  "domain",
  "ip",
  "country",
  "city",
  "continent",
  "device",
  "browser",
  "os",
  "ua",
  "referer",
  "trigger",
  "user_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

const DAY_LIMIT = 500_000;

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function tbSql<T = Record<string, unknown>>(q: string): Promise<T[]> {
  const token = process.env.TINYBIRD_TOKEN ?? process.env.TINYBIRD_API_KEY;
  const base = (
    process.env.TINYBIRD_URL ?? "https://api.us-east.aws.tinybird.co"
  ).replace(/\/$/, "");
  if (!token) throw new Error("TINYBIRD_TOKEN is required");
  const res = await fetch(`${base}/v0/sql?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Tinybird SQL ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  const json = (await res.json()) as { data?: T[] };
  return json.data ?? [];
}

function dayRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

function toClickHouseDT(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

async function main() {
  const days = Number(arg("days", "30"));
  const bucket = process.env.CLOUDFLARE_BUCKET_NAME;
  if (!bucket) throw new Error("CLOUDFLARE_BUCKET_NAME is required");
  const { start, end } = dayRange(days);
  const stamp = end.toISOString().slice(0, 10);
  const key =
    arg("key", "") ||
    `tinybird-exports/test/slugy_click_events_${days}d_${stamp}.parquet`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tb-export-"));
  const ndjsonPath = path.join(tmpDir, "clicks.ndjson");
  const parquetPath = path.join(tmpDir, "clicks.parquet");
  // Keep a local copy too (useful if the R2 upload needs manual dashboard upload).
  const localOut =
    arg("local-out", "") ||
    path.join(
      process.cwd(),
      "tinybird-exports",
      path.basename(key),
    );

  let total = 0;
  for (let d = 0; d < days; d++) {
    const dayStart = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const rows = await tbSql(
      `SELECT ${CLICK_COLUMNS.join(", ")} FROM slugy_click_events ` +
        `WHERE timestamp >= '${toClickHouseDT(dayStart)}' AND timestamp < '${toClickHouseDT(dayEnd)}' ` +
        `ORDER BY timestamp LIMIT ${DAY_LIMIT} FORMAT JSON`,
    );
    if (rows.length >= DAY_LIMIT) {
      console.warn(
        `[warn] ${dayStart.toISOString().slice(0, 10)} hit the ${DAY_LIMIT} row cap — export is truncated for that day`,
      );
    }
    const lines = rows
      .map((r) =>
        JSON.stringify(
          Object.fromEntries(
            CLICK_COLUMNS.map((c) => [c, (r as Record<string, unknown>)[c] ?? null]),
          ),
        ),
      )
      .join("\n");
    if (lines) fs.appendFileSync(ndjsonPath, lines + "\n");
    total += rows.length;
    console.log(`[export] ${dayStart.toISOString().slice(0, 10)}: ${rows.length} rows (total ${total})`);
  }

  if (total === 0) throw new Error("No click events found in range — aborting");

  console.log("[parquet] converting NDJSON → Parquet with DuckDB…");
  const db = new duckdbNative.Database(":memory:");
  const conn = new duckdbNative.Connection(db);
  const run = (sql: string) =>
    new Promise<void>((resolve, reject) =>
      conn.exec(sql, (err) => (err ? reject(err) : resolve())),
    );
  const all = (sql: string) =>
    new Promise<unknown[]>((resolve, reject) =>
      conn.all(sql, (err, rows) => (err ? reject(err) : resolve(rows))),
    );
  try {
    await run(
      `CREATE TABLE clicks AS SELECT * FROM read_ndjson('${ndjsonPath.replace(/'/g, "''")}', auto_detect=true)`,
    );
    await run(
      `COPY (SELECT * FROM clicks) TO '${parquetPath.replace(/'/g, "''")}' (FORMAT PARQUET, COMPRESSION ZSTD)`,
    );
    console.log("[parquet] rows in file:", await all("SELECT count(*) AS c FROM clicks"));
  } finally {
    (db as { close?: () => void }).close?.();
  }

  const parquetBytes = fs.readFileSync(parquetPath);
  console.log(
    `[parquet] ${(parquetBytes.length / 1024 / 1024).toFixed(2)} MB, ${total} rows`,
  );
  fs.mkdirSync(path.dirname(localOut), { recursive: true });
  fs.copyFileSync(parquetPath, localOut);
  console.log(`[parquet] local copy: ${localOut}`);

  console.log(`[r2] uploading to s3://${bucket}/${key} …`);
  if (flag("skip-upload")) {
    console.log(
      "[r2] --skip-upload: upload the local file via the R2 dashboard to key " +
        key,
    );
  } else {
    // CLOUDFLARE_S3_API_KEY holds the bucket's S3 endpoint URL
    // (https://<account>.r2.cloudflarestorage.com/<bucket>); use its host so
    // requests route to the right account.
    const endpointOverride = (() => {
      try {
        const raw = process.env.CLOUDFLARE_S3_API_KEY ?? "";
        const u = new URL(raw);
        return `${u.protocol}//${u.host}`;
      } catch {
        return undefined;
      }
    })();
    const s3 = new S3Service(bucket, endpointOverride);
    await s3.uploadFile(key, parquetBytes, "application/vnd.apache.parquet");
    console.log("[r2] upload ok");

    // Browser reads (DuckDB-Wasm) need CORS on the bucket — set once, idempotent.
    await s3.ensureBrowserReadCors();
    console.log("[r2] bucket CORS ensured for browser GET/HEAD");
  }

  console.log(`[done] rows=${total} key=${key}`);
  console.log(`[done] local: ${localOut}`);
  console.log(`[done] public URL guess: https://analytics.slugy.co/${key}`);

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error("[export] failed:", err);
  process.exit(1);
});
