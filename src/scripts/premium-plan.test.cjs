const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, modules = {}, env = {}, expose = []) {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8") +
      "\n" +
      expose.map((name) => `exports.${name} = ${name};`).join("\n"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    Date,
    console: { error() {}, warn() {} },
    process: { env },
    require(id) {
      if (id in modules) return modules[id];
      if (id === "server-only") return {};
      if (id === "./billing-period")
        return load("src/lib/subscription/billing-period.ts");
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports;
}

test("Usage API and action use owner plan limits after upgrades and expiry", async () => {
  for (const tier of ["premium", "growth", null]) {
    const plan = tier
      ? pricing.toPlanSeed(pricing.plans.find((p) => p.planType === tier))
      : null;
    const subscription = plan
      ? {
          plan,
          status: "active",
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 86400000),
        }
      : null;
    const workspace = {
      id: "workspace-1",
      userId: "owner-1",
      maxLinksLimit: 20,
      maxClicksLimit: 1000,
      maxUsers: 1,
    };
    const modules = {
      "@/constants/data/price": pricing,
      "@/lib/auth": {
        getAuthSession: async () => ({
          success: true,
          session: { user: { id: "member-1" } },
        }),
      },
      "@/server/db": {
        db: { workspace: { findFirst: async () => workspace } },
      },
      "@/lib/subscription/queries": {
        getSubscriptionWithPlan: async (id) => {
          assert.equal(id, "owner-1");
          return { success: !!subscription, subscription };
        },
      },
      "@/lib/usage/current-usage": {
        ensureCurrentUsageRecord: async (_, input) => {
          assert.equal(input.userId, "owner-1");
          return { linksCreated: 7 };
        },
      },
      "@/lib/subscription/reconcile": { isLifetimeBillingPeriod: () => false },
      "@/lib/http": { jsonWithETag: (_, data) => data },
    };
    const route = load(
      "src/app/api/workspace/[workspaceslug]/usages/route.ts",
      modules,
    );
    const action = load("src/server/actions/usages/get-usages.ts", modules);
    const expected = plan ?? pricing.toPlanSeed(pricing.FREE_PLAN);
    for (const result of [
      await route.GET(
        {},
        { params: Promise.resolve({ workspaceslug: "team" }) },
      ),
      await action.getUsages({ workspaceslug: "team" }),
    ]) {
      assert.equal(
        result.workspace.maxLinksLimit,
        expected.maxLinksPerWorkspace,
      );
      assert.equal(
        result.workspace.maxClicksLimit,
        expected.maxClicksPerWorkspace,
      );
      assert.equal(result.workspace.maxUsers, expected.maxUsers);
      assert.equal(result.usage.linksCreated, 7);
    }
  }
});

test("Recurring discounts preserve billing expiry; Basic alone remains lifetime", () => {
  const reconcile = load(
    "src/lib/subscription/reconcile.ts",
    {
      "@prisma/client": {},
      "@/lib/polar": {},
      "@/lib/subscription/basic-entitlement": {},
      "@/lib/subscription/limits-sync": {},
      "@/server/db": {},
    },
    {},
    ["resolveStoredPeriodEnd", "normalizeDbStatus"],
  );
  const start = new Date("2026-01-01");
  const end = new Date("2026-02-01");
  const century = new Date("2126-01-01");
  assert.equal(
    reconcile
      .resolveStoredPeriodEnd(
        {
          currentPeriodEnd: end,
          discount: { duration: "forever" },
          status: "active",
        },
        start,
        century,
      )
      .getTime(),
    end.getTime(),
  );
  assert.equal(
    reconcile
      .resolveStoredPeriodEnd(
        { discount: { duration: "forever" }, status: "active" },
        start,
        century,
      )
      .getTime(),
    start.getTime(),
  );
  for (const tier of ["pro", "growth", "premium"])
    assert.equal(
      reconcile.isLifetimeBillingPeriod(tier, start, century),
      false,
    );
  assert.equal(
    reconcile.isLifetimeBillingPeriod("basic", start, century),
    true,
  );
  assert.equal(
    reconcile.normalizeDbStatus("canceled", end, new Date("2026-03-01"), true),
    "inactive",
  );
  assert.equal(
    reconcile.normalizeDbStatus("canceled", end, new Date("2026-01-15"), true),
    "active",
  );
  const webhook = load(
    "src/lib/subscription/polar-webhook-handlers.ts",
    {
      "@/server/db": {},
      "@/lib/subscription/limits-sync": {},
      "@/lib/polar": {},
      "@/lib/subscription/basic-entitlement": {},
      "@/lib/subscription/reconcile": reconcile,
    },
    {},
    ["getNormalizedPeriodEnd"],
  );
  assert.equal(
    webhook
      .getNormalizedPeriodEnd("pro", start, end, {
        discount: { duration: "forever" },
        status: "active",
      })
      .getTime(),
    end.getTime(),
  );
});

test("Quota lock serializes competing tag/domain/seat writes and rejects expired entitlements", async () => {
  // Model a PostgreSQL row lock, rather than letting all mock transactions run serially.
  let queue = Promise.resolve();
  let count = 0;
  let subscription = {
    status: "active",
    periodStart: new Date(),
    periodEnd: new Date(Date.now() + 86400000),
    plan: {
      ...pricing.toPlanSeed(pricing.PREMIUM_PLAN),
      maxUsers: 2,
      maxCustomDomains: 2,
      maxTagsPerWorkspace: 2,
    },
  };
  const db = {
    workspace: { findFirst: async () => ({ userId: "owner" }) },
    $transaction: async (fn) => {
      let release;
      const tx = {
        $queryRaw: async (strings) => {
          assert.match(strings.join("?"), /FOR UPDATE/);
          const previous = queue;
          queue = new Promise((resolve) => {
            release = resolve;
          });
          await previous;
          return [{ userId: "owner" }];
        },
        subscription: { findUnique: async () => subscription },
        member: { count: async () => count },
        invitation: { count: async () => 0 },
      };
      try {
        return await fn(tx);
      } finally {
        release?.();
      }
    },
  };
  const helper = load("src/lib/subscription/workspace-quota.ts", {
    "@/server/db": { db },
    "@/constants/data/price": pricing,
    "@/lib/subscription/queries": {
      getSubscriptionWithPlan: async () => ({ subscription }),
    },
  });
  for (const field of ["maxUsers", "maxCustomDomains", "maxTagsPerWorkspace"]) {
    count = 1;
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        helper.withWorkspaceQuota("workspace", async (tx, plan) => {
          if (field === "maxUsers")
            await helper.assertSeatAvailable(
              tx,
              "workspace",
              plan.maxUsers,
              true,
            );
          else if (count >= plan[field])
            throw new helper.WorkspaceQuotaError("full");
          await Promise.resolve();
          count++;
        }),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(count, 2);
  }
  for (const patch of [
    { status: "inactive" },
    { periodEnd: new Date(0) },
    { periodEnd: new Date("2126-01-01") },
  ]) {
    const original = subscription;
    subscription = { ...original, ...patch };
    count = 1;
    await assert.rejects(
      () =>
        helper.withWorkspaceQuota("workspace", (tx, plan) =>
          helper.assertSeatAvailable(tx, "workspace", plan.maxUsers, false),
        ),
      /Team member limit/,
    );
    subscription = original;
  }
});

test("Limit synchronization cannot be registered as a public Server Action", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../lib/subscription/limits-sync.ts"),
    "utf8",
  );
  assert.match(source, /import "server-only"/);
  assert.doesNotMatch(source, /["']use server["']/);
});

test("Basic checkout cannot replace an active Premium subscription", async () => {
  const existing = {
    id: "subscription-1",
    status: "active",
    plan: { planType: "premium" },
    periodStart: new Date(),
    periodEnd: new Date(Date.now() + 86400000),
  };
  const basic = load("src/lib/subscription/basic-entitlement.ts", {
    "@/server/db": {
      db: { subscription: { findUnique: async () => existing } },
    },
    "@/lib/subscription/limits-sync": {},
    "@/lib/subscription/free-entitlement": {},
    "@/lib/subscription/reconcile": { isLifetimeBillingPeriod: () => false },
  });
  const result = await basic.activateBasicEntitlement({
    userId: "user-1",
    customerId: "customer-1",
  });
  assert.equal(result, existing);
});

const pricing = load(
  "src/constants/data/price.ts",
  {},
  {
    NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: "pro-monthly",
    NEXT_PUBLIC_PREMIUM_MONTHLY_PRICE_ID: "premium-monthly",
    NEXT_PUBLIC_PREMIUM_YEARLY_PRICE_ID: "premium-yearly",
  },
);

test("Premium pricing, public tiers, comparison values, and seed limits agree", () => {
  assert.equal(
    pricing.plans.map((p) => p.planType).join(","),
    "free,pro,growth,premium",
  );
  assert.equal(pricing.getPlanPrice(pricing.PREMIUM_PLAN, "monthly"), 199);
  assert.equal(pricing.getPlanPrice(pricing.PREMIUM_PLAN, "yearly"), 1990);
  assert.equal(pricing.PREMIUM_PLAN.monthlyPriceId, "premium-monthly");
  assert.equal(pricing.PREMIUM_PLAN.yearlyPriceId, "premium-yearly");
  const seed = pricing.toPlanSeed(pricing.PREMIUM_PLAN);
  assert.equal(seed.maxLinksPerWorkspace, 5000);
  assert.equal(seed.maxClicksPerWorkspace, 250000);
  assert.equal(seed.maxLinksPerBio, 100);
  assert.equal(seed.maxGalleries, 15);
  assert.ok(
    pricing.PRICING_COMPARISON_FEATURES.every(
      (row) => row.premium !== undefined,
    ),
  );
  assert.equal(pricing.plans.filter((p) => p.isRecommended)[0].planType, "growth");
});

test("Premium receives sales, leads, premium links, paid AI quota, and all-time retention", () => {
  const entitlements = load("src/lib/subscription/entitlements.ts", {
    "@/server/db": {},
    "@/lib/subscription/queries": {},
  });
  const quota = load("src/lib/ai/analytics-quota.ts", { "@/lib/redis": {} });
  const retention = load("src/lib/subscription/retention.ts");
  for (const tier of ["growth", "premium", "PREMIUM"]) {
    assert.equal(entitlements.canUseLeadTracking(tier), true);
    assert.equal(entitlements.canUseSalesAnalytics(tier), true);
    assert.equal(entitlements.canUsePremiumLinkFeatures(tier), true);
    assert.equal(entitlements.analyticsTierForPlan(tier), "sales");
    assert.equal(quota.quotaForPlan(tier).limit, 500);
  }
  for (const tier of ["free", "basic", "unknown", null]) {
    assert.equal(entitlements.canUseSalesAnalytics(tier), false);
    assert.equal(entitlements.canUseLeadTracking(tier), false);
  }
  assert.equal(entitlements.canUseSalesAnalytics("pro"), false);
  const startDate = new Date("2020-01-01");
  const now = new Date("2026-10-09");
  for (const tier of ["growth", "premium", "PREMIUM"]) {
    assert.equal(retention.getRetentionMonths(tier), Infinity);
    assert.equal(retention.clampPeriodByRetention(tier, "all"), "all");
    assert.equal(
      retention.clampStartDateByRetention(tier, startDate, now),
      startDate,
    );
    assert.equal(retention.clampPeriodByRetention(tier, "30d"), "30d");
  }
  assert.equal(retention.clampPeriodByRetention("pro", "all"), "12m");
  assert.equal(retention.clampPeriodByRetention("free", "all"), "30d");
  assert.equal(
    retention.clampStartDateByRetention("pro", startDate, now).toISOString(),
    "2025-10-09T00:00:00.000Z",
  );
});

test("Polar name matching prioritizes Premium and preserves legacy names", () => {
  const reconcile = load("src/lib/subscription/reconcile.ts", {
    "@prisma/client": {},
    "@/lib/polar": {},
    "@/lib/subscription/basic-entitlement": {},
    "@/lib/subscription/limits-sync": {},
    "@/server/db": {},
  });
  for (const name of [
    "Slugy Premium monthly",
    "PREMIUM yearly",
    "Premium product",
  ]) {
    assert.equal(reconcile.getPlanTypeByProductName(name), "premium");
  }
  assert.equal(reconcile.getPlanTypeByProductName("Business"), "growth");
  assert.equal(reconcile.getPlanTypeByProductName("Pro monthly"), "pro");
  assert.equal(reconcile.getPlanTypeByProductName("Basic"), "basic");
  assert.equal(reconcile.getPlanTypeByProductName("Unknown"), null);
});

test("GETPRO is restricted to verified Pro monthly checkout", () => {
  const promo = load("src/lib/subscription/promo.ts", {
    "@/constants/data/price": pricing,
    "@/lib/polar": {},
  });
  assert.equal(
    promo.shouldApplyCheckoutPromo(["pro-monthly"], "monthly"),
    true,
  );
  for (const ids of [
    [],
    ["premium-monthly"],
    ["premium-yearly"],
    ["pro-monthly", "premium-monthly"],
  ]) {
    assert.equal(promo.shouldApplyCheckoutPromo(ids, "monthly"), false);
  }
  assert.equal(
    promo.shouldApplyCheckoutPromo(["pro-monthly"], "yearly"),
    false,
  );
  const unconfigured = load("src/lib/subscription/promo.ts", {
    "@/constants/data/price": load("src/constants/data/price.ts"),
    "@/lib/polar": {},
  });
  assert.equal(
    unconfigured.shouldApplyCheckoutPromo(["premium-monthly"], "monthly"),
    false,
  );
});

test("Missing Premium database row uses Premium workspace and bio limits", async () => {
  const writes = [];
  const limits = load("src/lib/subscription/limits-sync.ts", {
    "@/server/db": {
      db: {
        plan: { findFirst: async () => null },
        workspace: { updateMany: async (args) => writes.push(args) },
        bio: { updateMany: async (args) => writes.push(args) },
      },
    },
    "next/cache": {},
    "@/constants/data/price": pricing,
  });
  assert.equal(
    (await limits.syncUserLimits("user-1", "premium")).success,
    true,
  );
  assert.equal(writes[0].data.maxLinksLimit, 5000);
  assert.equal(writes[0].data.maxUsers, 15);
  assert.equal(writes[1].data.maxLinksLimit, 100);
  assert.equal(writes[1].data.maxClicksLimit, 250000);
});
