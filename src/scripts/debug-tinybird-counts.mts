import "dotenv/config";

const token = process.env.TINYBIRD_TOKEN!;
const base = (process.env.TINYBIRD_URL || "https://api.us-east.aws.tinybird.co").replace(
  /\/$/,
  "",
);

async function sql(q: string) {
  const res = await fetch(`${base}/v0/sql?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  console.log("\n---", res.status, q.slice(0, 100));
  console.log(text.slice(0, 1200));
}

await sql("SELECT count() AS c FROM slugy_click_events");
await sql("SELECT count() AS c FROM slugy_click_events_mv");
await sql("SELECT count() AS c FROM slugy_links_metadata");
await sql("SELECT count() AS c FROM slugy_links_metadata_latest");
await sql(
  "SELECT link_id, slug, workspace_id, toString(timestamp) AS ts FROM slugy_click_events ORDER BY timestamp DESC LIMIT 5 FORMAT JSON",
);
await sql(
  "SELECT link_id, slug, workspace_id, deleted FROM slugy_links_metadata_latest FINAL LIMIT 5 FORMAT JSON",
);
await sql(
  "SELECT count() AS c FROM slugy_click_events WHERE slug = 'ai-short-memory3'",
);
