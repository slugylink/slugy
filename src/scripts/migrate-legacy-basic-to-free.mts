/**
 * Legacy "Basic" subscriptions that were never paid (provider=internal,
 * no customer/price/subscription id, no lifetimeBasicAt) are former Free
 * users relabeled by the free→basic enum rename. Move them back to Free and
 * re-sync workspace limits.
 *
 * Real $1 lifetime Basic buyers (Polar customer/price present, or
 * lifetimeBasicAt set) are NEVER touched.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-legacy-basic-to-free.mts --dry-run
 *   npx tsx src/scripts/migrate-legacy-basic-to-free.mts --apply
 */
import { db } from "../server/db";
import { syncUserLimits } from "../lib/subscription/limits-sync";

const DRY_RUN = !process.argv.includes("--apply");

async function main() {
  const [basicPlan, freePlan] = await Promise.all([
    db.plan.findFirst({ where: { planType: "basic" }, select: { id: true } }),
    db.plan.findFirst({ where: { planType: "free" }, select: { id: true } }),
  ]);

  if (!basicPlan || !freePlan) {
    throw new Error("Missing basic or free plan row");
  }

  const candidates = await db.subscription.findMany({
    where: {
      planId: basicPlan.id,
      provider: "internal",
      customerId: null,
      priceId: null,
      subscriptionId: null,
    },
    select: {
      id: true,
      referenceId: true,
      status: true,
      user: { select: { lifetimeBasicAt: true, customerId: true } },
    },
  });

  // Safety net: skip anyone with any real payment footprint.
  const toMigrate = candidates.filter(
    (s) => !s.user?.lifetimeBasicAt && !s.user?.customerId,
  );

  console.log(
    `[migrate] basic=${basicPlan.id.slice(0, 8)} free=${freePlan.id.slice(0, 8)} candidates=${candidates.length} migratable=${toMigrate.length}`,
  );

  if (toMigrate.length === 0) {
    console.log("[migrate] Nothing to migrate.");
    return;
  }

  if (DRY_RUN) {
    for (const s of toMigrate.slice(0, 10)) {
      console.log(`  would move sub ${s.id} (user ${s.referenceId}) → Free`);
    }
    console.log(
      `[migrate] DRY RUN — ${toMigrate.length} subscriptions would move to Free. Re-run with --apply.`,
    );
    return;
  }

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 100);

  const result = await db.subscription.updateMany({
    where: {
      id: { in: toMigrate.map((s) => s.id) },
      planId: basicPlan.id,
      provider: "internal",
      customerId: null,
      priceId: null,
    },
    data: {
      planId: freePlan.id,
      status: "active",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      subscriptionId: null,
      periodStart,
      periodEnd,
      billingInterval: "month",
    },
  });

  console.log(`[migrate] Updated ${result.count} subscriptions → Free.`);

  // Re-sync limits so workspaces reflect the Free caps.
  const userIds = [...new Set(toMigrate.map((s) => s.referenceId))];
  let synced = 0;
  for (const userId of userIds) {
    const res = await syncUserLimits(userId, "free");
    if (res.success) synced++;
  }
  console.log(`[migrate] Re-synced limits for ${synced}/${userIds.length} users.`);
}

main()
  .catch((error) => {
    console.error("[migrate] Failed:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
