-- AlterTable
ALTER TABLE "analytics" ADD COLUMN     "clickId" TEXT;

-- AlterTable
ALTER TABLE "usages" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "analytics_clickedAt_idx" ON "analytics"("clickedAt");

-- CreateIndex
CREATE INDEX "analytics_clickedAt_linkId_idx" ON "analytics"("clickedAt", "linkId");

-- CreateIndex
CREATE INDEX "analytics_clickedAt_country_idx" ON "analytics"("clickedAt", "country");

-- CreateIndex
CREATE INDEX "analytics_clickedAt_city_idx" ON "analytics"("clickedAt", "city");

-- CreateIndex
CREATE INDEX "analytics_clickedAt_continent_idx" ON "analytics"("clickedAt", "continent");

-- CreateIndex
CREATE INDEX "analytics_clickedAt_device_idx" ON "analytics"("clickedAt", "device");

-- CreateIndex
CREATE INDEX "analytics_clickedAt_browser_idx" ON "analytics"("clickedAt", "browser");

-- CreateIndex
CREATE INDEX "analytics_clickedAt_os_idx" ON "analytics"("clickedAt", "os");

-- CreateIndex
CREATE INDEX "analytics_clickedAt_referer_idx" ON "analytics"("clickedAt", "referer");

-- CreateIndex
CREATE INDEX "links_workspaceId_id_idx" ON "links"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "usages_deletedAt_createdAt_idx" ON "usages"("deletedAt", "createdAt" DESC);
