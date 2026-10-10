// Run: node --test scripts/test-campaigns.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(path, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => (name in mocks ? mocks[name] : require(name)),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const validation = load("src/lib/campaigns/validation.ts");
test("cost imports validate calendar dates, amounts, and duplicate row keys", () => {
  const row = {
    date: "2026-10-10",
    spend: "50.25",
    currency: "usd",
    source: "google",
  };
  assert.equal(validation.costsSchema.parse([row])[0].currency, "USD");
  for (const invalid of [
    { ...row, date: "2026-02-30" },
    { ...row, spend: -1 },
    { ...row, spend: Infinity },
    { ...row, currency: "US" },
  ])
    assert.equal(validation.costsSchema.safeParse([invalid]).success, false);
  assert.equal(validation.costsSchema.safeParse([row, row]).success, false);
});
test("ROAS, CPA, and zero denominators", () => {
  assert.deepEqual(validation.moneyMetrics(200, 50, 10), {
    revenue: 200,
    spend: 50,
    roas: 4,
    cpa: 5,
  });
  assert.equal(validation.moneyMetrics(10, 0, 0).roas, null);
  assert.equal(validation.moneyMetrics(10, 0, 0).cpa, null);
});
test("conversion anomalies use seven completed days and require a baseline", () => {
  assert.equal(
    validation.conversionAnomaly([10, 10, 10, 10, 10, 10, 10], 0),
    true,
  );
  assert.equal(
    validation.conversionAnomaly([10, 10, 10, 10, 10, 10, 10], 11),
    false,
  );
  assert.equal(validation.conversionAnomaly([0, 0, 0, 0, 0, 0, 0], 20), false);
});
test("bot and duplicate classification including Redis outage", async () => {
  let first = true;
  const rules = load("src/lib/middleware/bot-patterns.ts");
  const quality = load("src/lib/campaigns/quality.ts", {
    "@/lib/redis": {
      redis: { set: async () => (first ? ((first = false), "OK") : null) },
    },
    "@/lib/middleware/bot-patterns": rules,
  });
  assert.equal(quality.scoreTraffic("Googlebot", false).qualityScore, 0);
  assert.equal(quality.scoreTraffic("Mozilla/5.0", true).qualityScore, 25);
  assert.equal(quality.scoreTraffic("Mozilla/5.0", false).qualityScore, 100);
  assert.equal(
    (await quality.clickQuality("l", "c", "1.2.3.4", "Mozilla", "direct"))
      .isDuplicate,
    false,
  );
  assert.equal(
    (await quality.clickQuality("l", "c", "1.2.3.4", "Mozilla", "direct"))
      .isDuplicate,
    true,
  );
});
test("destination checks reject local, mapped, and private addresses", () => {
  const { isPublicAddress } = load("src/lib/campaigns/check-destination.ts");
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.0.1",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
  ])
    assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress("8.8.8.8"), true);
});
test("report isolates currencies, matches click IDs, and strips gated money", async () => {
  const { campaignReport } = load("src/lib/campaigns/report.ts", {
    "./validation": validation,
    "@/lib/tinybird/http": { getTinybirdConfig: () => ({}) },
    "@/server/db": {
      db: {
        campaign: {
          findFirst: async ({ where }) =>
            where.workspaceId === "w"
              ? { id: "c", name: "Campaign", links: [], trafficSource: null }
              : null,
        },
        leadEvent: {
          groupBy: async () => [
            { saleCurrency: "USD", _sum: { saleAmount: 200 } },
            { saleCurrency: "EUR", _sum: { saleAmount: 100 } },
          ],
        },
        campaignCost: {
          findMany: async () => [
            {
              date: new Date("2026-10-10"),
              spend: 50,
              currency: "USD",
              source: "google",
            },
          ],
        },
        $queryRaw: async (sql) => {
          const query = sql.join("");
          if (query.includes("AS leads"))
            return [{ leads: 1n, sales: 2n, events: 3n, matched: 2n }];
          if (query.includes("AS clicks"))
            return [
              {
                clicks: 5n,
                visitors: 4n,
                measured: 5n,
                bots: 0n,
                duplicates: 0n,
              },
            ];
          return [
            {
              country: "IN",
              browser: "Chrome",
              device: "desktop",
              conversions: 1n,
            },
          ];
        },
      },
    },
  });
  const report = await campaignReport("w", "c", true, true);
  assert.equal(report.leads, 1);
  assert.equal(report.sales, 2);
  assert.equal(report.money.find((r) => r.currency === "USD").roas, 4);
  assert.equal(report.money.find((r) => r.currency === "EUR").roas, null);
  const hidden = await campaignReport("w", "c", false, false);
  assert.deepEqual(hidden.money, []);
  assert.deepEqual(hidden.costs, []);
  assert.equal(hidden.sales, null);
  assert.equal(await campaignReport("other-workspace", "c", true, true), null);
});
test("cost import is workspace scoped and upserts rather than incrementing spend", async () => {
  const writes = [];
  const { importCampaignCosts } = load("src/lib/campaigns/costs.ts", {
    "./access": {
      campaignAccess: async () => ({ ok: true, workspaceId: "w" }),
      campaignError: (e) => {
        throw e;
      },
    },
    "./validation": validation,
    "@/server/db": {
      db: {
        campaign: {
          findFirst: async ({ where }) =>
            where.workspaceId === "w" && where.id === "c"
              ? { trafficSource: null }
              : null,
        },
        campaignCost: {
          upsert: async (args) => {
            writes.push(args);
          },
        },
        $transaction: async (operations) => Promise.all(operations),
      },
    },
  });
  const req = () =>
    new Request("https://slugy.co/api/campaigns/c/costs", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: "date,spend,currency,source\n2026-10-10,50,USD,google",
    });
  assert.equal((await importCampaignCosts(req(), "other")).status, 404);
  assert.equal(writes.length, 0);
  assert.equal((await importCampaignCosts(req(), "c")).status, 200);
  assert.equal((await importCampaignCosts(req(), "c")).status, 200);
  assert.deepEqual(writes[0].where, writes[1].where);
  assert.deepEqual(writes[0].update, { spend: 50 });
});

test("campaign authorization enforces membership, API scope, and plan gates", async () => {
  let plan = "pro";
  const permissions = [];
  const { campaignAccess } = load("src/lib/campaigns/access.ts", {
    "@/lib/workspace-access": {
      requireWorkspaceAccess: async (slug) =>
        slug === "mine"
          ? { ok: true, workspace: { id: "w" } }
          : { ok: false, response: new Response(null, { status: 404 }) },
    },
    "@/lib/api-keys/auth": {
      authenticateApiKey: async (_header, permission, resource) => {
        permissions.push([permission, resource]);
        return { ok: true, apiKey: { workspaceId: "w" } };
      },
    },
    "@/server/db": {
      db: {
        workspace: {
          findFirst: async ({ where }) =>
            !where.slug || where.slug === "mine" ? { id: "w" } : null,
        },
      },
    },
    "@/lib/subscription/entitlements": {
      getWorkspaceOwnerPlanType: async () => plan,
      canUseLeadTracking: (p) => ["pro", "growth"].includes(p),
      canUseSalesAnalytics: (p) => p === "growth",
    },
  });
  const request = new Request("https://example.test");
  assert.equal((await campaignAccess(request, "foreign")).response.status, 404);
  assert.equal((await campaignAccess(request)).response.status, 401);
  assert.equal((await campaignAccess(request, "mine")).ok, true);
  assert.equal(
    (await campaignAccess(request, "mine", true)).response.status,
    403,
  );
  plan = "free";
  assert.equal((await campaignAccess(request, "mine")).response.status, 403);
  plan = "growth";
  const apiRequest = new Request("https://example.test", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
  });
  assert.equal(
    (await campaignAccess(apiRequest, "foreign", true)).response.status,
    404,
  );
  assert.equal((await campaignAccess(apiRequest, "mine", true)).ok, true);
  assert.deepEqual(permissions.at(-1), ["write", "links"]);
});
