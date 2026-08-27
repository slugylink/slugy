import "dotenv/config";

const token = process.env.TINYBIRD_TOKEN!;
const base = (process.env.TINYBIRD_URL || "https://api.us-east.aws.tinybird.co").replace(
  /\/$/,
  "",
);
const workspaceId = "cml0gpnv100037kpsvs2p064r";

async function pipe(name: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${base}/v0/pipes/${name}.json?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  console.log("\n---", name, res.status);
  console.log(text.slice(0, 2000));
}

await pipe("analytics_pipe", {
  workspace_id: workspaceId,
  date_range: "24h",
});

await pipe("analytics_pipe", {
  workspace_id: workspaceId,
  date_range: "all",
});

// Join sanity check
const sql = `
SELECT count() AS c
FROM slugy_click_events_mv AS ev
INNER JOIN (
  SELECT link_id, workspace_id, slug, url, deleted
  FROM slugy_links_metadata_latest FINAL
) AS meta
  ON ev.link_id = meta.link_id AND ev.workspace_id = meta.workspace_id
WHERE ev.workspace_id = '${workspaceId}' AND meta.deleted = 0
FORMAT JSON
`;
const res = await fetch(`${base}/v0/sql?q=${encodeURIComponent(sql)}`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log("\n--- join count", res.status);
console.log((await res.text()).slice(0, 800));
