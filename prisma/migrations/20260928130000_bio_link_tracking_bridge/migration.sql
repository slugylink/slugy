-- Bio <-> Link tracking bridge (additive only).
-- Links bio buttons to workspace short links for shared analytics/QR/domains.
-- NOTE: intentionally does NOT drop legacy tables (conversion_events,
-- customers, tracked_clicks) — dead but left for a separate cleanup.

-- AlterTable
ALTER TABLE "bio_links" ADD COLUMN     "linkId" TEXT,
ADD COLUMN     "linkManagedByBio" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "bios" ADD COLUMN     "workspaceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bio_links_linkId_key" ON "bio_links"("linkId");

-- CreateIndex
CREATE INDEX "bio_links_linkId_idx" ON "bio_links"("linkId");

-- CreateIndex
CREATE INDEX "bios_workspaceId_idx" ON "bios"("workspaceId");

-- AddForeignKey
ALTER TABLE "bios" ADD CONSTRAINT "bios_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bio_links" ADD CONSTRAINT "bio_links_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
