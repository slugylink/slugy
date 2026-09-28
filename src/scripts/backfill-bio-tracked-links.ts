/**
 * Backfill tracked workspace Links for existing BioLinks rows with linkId=null.
 * Run: npx ts-node --project tsconfig.scripts.json src/scripts/backfill-bio-tracked-links.ts
 */
import { db } from "@/server/db";
import { createTrackedLinkForBio } from "@/lib/bio-link-bridge";
import { invalidateMultipleBioPublicCache } from "@/lib/cache-utils/bio-public-cache";

async function main() {
  const batchSize = 100;
  let total = 0;
  let linked = 0;
  let skipped = 0;
  const touchedBioIds = new Set<string>();

  for (;;) {
    const rows = await db.bioLinks.findMany({
      where: { linkId: null, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: batchSize,
      select: {
        id: true,
        title: true,
        url: true,
        bioId: true,
        bio: { select: { userId: true, username: true } },
      },
    });
    if (!rows.length) break;
    total += rows.length;

    for (const row of rows) {
      const userId = row.bio?.userId;
      if (!userId) {
        skipped++;
        continue;
      }
      try {
        const tracked = await createTrackedLinkForBio({
          userId,
          title: row.title,
          url: row.url,
        });
        if (!tracked) {
          skipped++;
          continue;
        }
        await db.bioLinks.update({
          where: { id: row.id },
          data: { linkId: tracked.id, linkManagedByBio: true },
        });
        touchedBioIds.add(row.bioId);
        linked++;
      } catch (error) {
        console.warn(`[Backfill] failed for ${row.id}:`, error);
        skipped++;
      }
    }
    console.log(
      `[Backfill] progress: total=${total} linked=${linked} skipped=${skipped}`,
    );
  }

  if (touchedBioIds.size > 0) {
    const bios = await db.bio.findMany({
      where: { id: { in: [...touchedBioIds] } },
      select: { username: true },
    });
    const usernames = [...new Set(bios.map((b) => b.username))];
    if (usernames.length > 0) {
      await invalidateMultipleBioPublicCache(usernames);
      console.log(
        `[Backfill] invalidated public cache for ${usernames.length} bios`,
      );
    }
  }

  console.log(
    `[Backfill] done: total=${total} linked=${linked} skipped=${skipped}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
