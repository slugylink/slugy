-- CreateIndex
CREATE INDEX "links_workspaceId_isArchived_idx" ON "links"("workspaceId", "isArchived");

-- CreateIndex
CREATE INDEX "links_workspaceId_createdAt_idx" ON "links"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "links_workspaceId_clicks_idx" ON "links"("workspaceId", "clicks");

-- CreateIndex
CREATE INDEX "links_workspaceId_lastClicked_idx" ON "links"("workspaceId", "lastClicked");

-- CreateIndex
CREATE INDEX "links_workspaceId_isArchived_createdAt_idx" ON "links"("workspaceId", "isArchived", "createdAt");
