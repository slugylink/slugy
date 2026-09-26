"use client";

import { useEffect, useRef, useState } from "react";
import * as duckdb from "@duckdb/duckdb-wasm";

// Parquet produced by: npx ts-node --project tsconfig.scripts.json
//   src/scripts/export-clicks-to-r2-parquet.mts --days 30
const PARQUET_URL =
  "https://analytics.slugy.co/tinybird-exports/test/slugy_click_events_30d_2026-09-26.parquet";

type Status = "idle" | "loading" | "ready" | "error";

interface DayRow {
  day: string;
  clicks: number;
}
interface TopRow {
  name: string;
  clicks: number;
}

interface ArrowLikeTable {
  toArray(): Array<{ toJSON(): unknown }>;
}

function arrowToRows(table: ArrowLikeTable): Record<string, unknown>[] {
  return table.toArray().map((row) => row.toJSON() as Record<string, unknown>);
}

export default function TestR2Analytics() {
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState<string>("Not started");
  const [total, setTotal] = useState<number | null>(null);
  const [byDay, setByDay] = useState<DayRow[]>([]);
  const [byCountry, setByCountry] = useState<TopRow[]>([]);
  const [byDevice, setByDevice] = useState<TopRow[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        setStatus("loading");
        // Engine files are self-hosted under /duckdb (same origin) because
        // browsers refuse to construct a Worker from a cross-origin CDN URL.
        // MVP build = single-threaded, no COOP/COEP headers needed.
        setDetail("Starting local DuckDB-Wasm engine…");
        const worker = new Worker("/duckdb/duckdb-browser-mvp.worker.js");
        const logger = new duckdb.ConsoleLogger();
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate("/duckdb/duckdb-mvp.wasm");

        setDetail("Opening connection + httpfs…");
        const conn = await db.connect();
        await conn.query(`INSTALL httpfs; LOAD httpfs;`);
        await conn.query(
          `CREATE VIEW clicks AS SELECT * FROM read_parquet('${PARQUET_URL}')`,
        );

        setDetail("Querying totals…");
        const totalRows = arrowToRows(
          await conn.query(`SELECT count(*) AS c FROM clicks`),
        );
        setTotal(Number(totalRows[0]?.c ?? 0));

        setDetail("Querying clicks by day…");
        const dayRows = arrowToRows(
          await conn.query(
            `SELECT CAST(timestamp AS DATE) AS day, count(*) AS clicks FROM clicks GROUP BY day ORDER BY day`,
          ),
        );
        setByDay(
          dayRows.map((r) => ({
            day: String(r.day).slice(0, 10),
            clicks: Number(r.clicks),
          })),
        );

        setDetail("Querying top countries + devices…");
        const countryRows = arrowToRows(
          await conn.query(
            `SELECT nullif(country, '') AS name, count(*) AS clicks FROM clicks GROUP BY name ORDER BY clicks DESC LIMIT 10`,
          ),
        );
        setByCountry(
          countryRows.map((r) => ({
            name: String(r.name ?? "(unknown)"),
            clicks: Number(r.clicks),
          })),
        );
        const deviceRows = arrowToRows(
          await conn.query(
            `SELECT nullif(device, '') AS name, count(*) AS clicks FROM clicks GROUP BY name ORDER BY clicks DESC LIMIT 10`,
          ),
        );
        setByDevice(
          deviceRows.map((r) => ({
            name: String(r.name ?? "(unknown)"),
            clicks: Number(r.clicks),
          })),
        );

        await conn.close();
        await db.terminate();
        setStatus("ready");
        setDetail(`Arrow results materialized in-browser from ${PARQUET_URL}`);
      } catch (err) {
        console.error(err);
        setStatus("error");
        setDetail(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">R2 analytics test</h1>
        <p className="text-muted-foreground mt-1 text-sm break-all">
          DuckDB-Wasm + Arrow reading Parquet straight from R2: {PARQUET_URL}
        </p>
        <p className="mt-2 text-sm">
          Status:{" "}
          <span className="font-mono font-medium">
            {status} — {detail}
          </span>
        </p>
        {total !== null && (
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {total.toLocaleString()}{" "}
            <span className="text-base font-normal">clicks (30d)</span>
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-lg font-medium">Clicks by day</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {byDay.map((r) => (
                <tr key={r.day} className="border-t">
                  <td className="px-3 py-1.5 font-mono">{r.day}</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-lg font-medium">Top countries</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-3 py-2 font-medium">Country</th>
                  <th className="px-3 py-2 font-medium">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {byCountry.map((r) => (
                  <tr key={r.name} className="border-t">
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 tabular-nums">{r.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-medium">Top devices</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-3 py-2 font-medium">Device</th>
                  <th className="px-3 py-2 font-medium">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {byDevice.map((r) => (
                  <tr key={r.name} className="border-t">
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 tabular-nums">{r.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
