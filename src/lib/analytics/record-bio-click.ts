import { primarySql } from "@/server/neon";

/**
 * Edge-safe bio click counter (no Prisma / no origin HTTP hop).
 * Validates that the bio button is actually wired to this short link
 * before incrementing, so a forged ?bio= id can't inflate other buttons.
 */
export async function recordBioClick(input: {
  bioLinkId: string;
  linkId: string;
}): Promise<{ ok: boolean }> {
  try {
    const rows = await primarySql`
      SELECT id, "bioId"
      FROM "bio_links"
      WHERE id = ${input.bioLinkId}
        AND "linkId" = ${input.linkId}
        AND "deletedAt" IS NULL
      LIMIT 1
    `;
    const bioLink = rows[0] as { id: string; bioId: string } | undefined;
    if (!bioLink) return { ok: false };

    await Promise.all([
      primarySql`
        UPDATE "bio_links"
        SET clicks = clicks + 1, "updatedAt" = NOW()
        WHERE id = ${bioLink.id}
      `,
      primarySql`
        UPDATE "bios"
        SET "clicksUsage" = "clicksUsage" + 1, "updatedAt" = NOW()
        WHERE id = ${bioLink.bioId}
      `,
    ]);

    return { ok: true };
  } catch (error) {
    console.error("[recordBioClick]", error);
    return { ok: false };
  }
}
