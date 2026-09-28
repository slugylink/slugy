/**
 * Backfill SHA-256 hashes for API keys created before secret hashing.
 * Additive only: fills keyHash/keyHint, never touches the raw `key` column
 * (dropped by a follow-up migration once every row is hashed).
 *
 * Run: npx ts-node --project tsconfig.scripts.json src/scripts/backfill-apikey-hashes.ts
 */
import { createHash } from "crypto";
import { db } from "@/server/db";

function mask(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

async function main() {
  const batchSize = 100;
  let scanned = 0;
  let hashed = 0;
  let skipped = 0;

  for (;;) {
    const rows = await db.workspaceApiKey.findMany({
      where: { keyHash: null },
      orderBy: { createdAt: "asc" },
      take: batchSize,
      select: { id: true, key: true },
    });
    if (rows.length === 0) break;
    scanned += rows.length;

    for (const row of rows) {
      // Already-migrated placeholder or empty — nothing secret to hash.
      if (!row.key || !row.key.startsWith("slugy_")) {
        skipped++;
        continue;
      }
      const keyHash = createHash("sha256")
        .update(row.key, "utf8")
        .digest("hex");
      await db.workspaceApiKey.update({
        where: { id: row.id },
        data: { keyHash, keyHint: mask(row.key) },
      });
      hashed++;
    }

    console.log(
      `[Backfill] progress: scanned=${scanned} hashed=${hashed} skipped=${skipped}`,
    );
  }

  const remaining = await db.workspaceApiKey.count({
    where: { keyHash: null },
  });
  console.log(
    `[Backfill] done: scanned=${scanned} hashed=${hashed} skipped=${skipped} remaining=${remaining}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
