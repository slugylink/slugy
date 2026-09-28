/**
 * Normalize mixed-case Bio usernames to lowercase so public lookups
 * (bio/[username]) and cache keys never 404 on case. Creation already
 * enforces lowercase; this heals rows written before that.
 *
 * Collision policy: if the lowercase form is taken by another gallery, the
 * row is SKIPPED and reported — never merged or renamed blindly.
 *
 * Run: npx ts-node --project tsconfig.scripts.json src/scripts/normalize-bio-usernames.ts
 */
import { db } from "@/server/db";
import { invalidateMultipleBioPublicCache } from "@/lib/cache-utils/bio-public-cache";

async function main() {
  const batchSize = 100;
  let scanned = 0;
  let normalized = 0;
  let skipped = 0;
  const skippedUsernames: string[] = [];
  const touchedUsernames = new Set<string>();

  for (;;) {
    const rows = await db.bio.findMany({
      orderBy: { createdAt: "asc" },
      take: batchSize,
      skip: scanned,
      select: { id: true, username: true },
    });
    if (rows.length === 0) break;
    scanned += rows.length;

    for (const row of rows) {
      const lowered = row.username.toLowerCase().trim();
      if (lowered === row.username) continue;

      const clash = await db.bio.findUnique({
        where: { username: lowered },
        select: { id: true },
      });
      if (clash && clash.id !== row.id) {
        skipped++;
        skippedUsernames.push(`${row.username} (lowercase taken)`);
        continue;
      }

      await db.bio.update({
        where: { id: row.id },
        data: { username: lowered },
      });
      touchedUsernames.add(row.username);
      touchedUsernames.add(lowered);
      normalized++;
    }

    console.log(
      `[Normalize] progress: scanned=${scanned} normalized=${normalized} skipped=${skipped}`,
    );
  }

  if (touchedUsernames.size > 0) {
    await invalidateMultipleBioPublicCache([...touchedUsernames]);
  }

  console.log(
    `[Normalize] done: scanned=${scanned} normalized=${normalized} skipped=${skipped}`,
  );
  if (skippedUsernames.length > 0) {
    console.log(`[Normalize] skipped (manual review needed):`);
    for (const name of skippedUsernames) console.log(`  - ${name}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
