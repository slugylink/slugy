/**
 * One-off cleanup: usage records created before quota counters were
 * workspace-scoped. Removes (soft-deletes) any usage row whose userId is not
 * the workspace owner, so the next limit check mints a single owner-keyed
 * record with accurate counters.
 *
 * Usage: npx tsx src/scripts/cleanup-usage-records.mts [--dry-run]
 */
import { db } from "../server/db";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const workspaces = await db.workspace.findMany({
    select: { id: true, userId: true, name: true },
  });

  const ownerByWorkspace = new Map(
    workspaces.map((w) => [w.id, w.userId]),
  );

  // All live usage rows.
  const usages = await db.usage.findMany({
    where: { deletedAt: null },
    select: { id: true, workspaceId: true, userId: true, createdAt: true },
  });

  const stray = usages.filter((u) => {
    const owner = ownerByWorkspace.get(u.workspaceId);
    return owner && u.userId !== owner;
  });

  // Workspaces with multiple owner-keyed records (only keep the newest).
  const byWorkspaceOwner = new Map<string, typeof usages>();
  for (const u of usages) {
    const owner = ownerByWorkspace.get(u.workspaceId);
    if (!owner || u.userId !== owner) continue;
    const list = byWorkspaceOwner.get(u.workspaceId) ?? [];
    list.push(u);
    byWorkspaceOwner.set(u.workspaceId, list);
  }
  const duplicates = [...byWorkspaceOwner.entries()].flatMap(
    ([, list]) =>
      [...list].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ).slice(1),
  );

  const toRemove = [...stray, ...duplicates];

  console.log(
    `[cleanup] workspaces=${workspaces.length} liveUsage=${usages.length} stray=${stray.length} duplicateOwnerRows=${duplicates.length}`,
  );

  if (toRemove.length === 0) {
    console.log("[cleanup] Nothing to do.");
    return;
  }

  if (DRY_RUN) {
    for (const row of toRemove.slice(0, 20)) {
      console.log(
        `  would soft-delete usage ${row.id} (workspace ${row.workspaceId}, user ${row.userId})`,
      );
    }
    console.log(`[cleanup] Dry run — ${toRemove.length} rows would be removed.`);
    return;
  }

  const result = await db.usage.updateMany({
    where: { id: { in: toRemove.map((r) => r.id) } },
    data: { deletedAt: new Date() },
  });

  console.log(`[cleanup] Soft-deleted ${result.count} usage rows.`);
}

main()
  .catch((error) => {
    console.error("[cleanup] Failed:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
