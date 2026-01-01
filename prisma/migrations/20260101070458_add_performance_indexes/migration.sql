-- CreateIndex
CREATE INDEX "links_slug_domain_idx" ON "links"("slug", "domain");

-- CreateIndex
CREATE INDEX "links_workspaceId_slug_idx" ON "links"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "links_workspaceId_domain_idx" ON "links"("workspaceId", "domain");

-- CreateIndex
CREATE INDEX "links_workspaceId_slug_domain_idx" ON "links"("workspaceId", "slug", "domain");
