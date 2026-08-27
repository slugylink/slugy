import "dotenv/config";
import { tinybird } from "../lib/tinybird/could/tinybird.ts";
import { transformTinybirdAnalytics } from "../lib/analytics/transform-tinybird.ts";

const workspaceId = "cml0gpnv100037kpsvs2p064r";

const result = await tinybird.analyticsPipe.query({
  workspace_id: workspaceId,
  date_range: "24h",
  slug: "",
  url: "",
  country: "",
  city: "",
  continent: "",
  browser: "",
  os: "",
  referer: "",
  device: "",
  domain: "",
});

console.log("SDK rows", result.data?.length);
console.log(JSON.stringify(result.data?.[0], null, 2));

const rows = (result.data ?? []).map((row) => ({
  ...row,
  clicks: Number(row.clicks),
}));

const transformed = transformTinybirdAnalytics(
  rows,
  ["totalClicks", "clicksOverTime", "links"],
  "24h",
);

console.log("transformed", JSON.stringify(transformed, null, 2));
