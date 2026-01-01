-- CreateIndex
CREATE INDEX "members_workspaceId_idx" ON "members"("workspaceId");

-- CreateIndex
CREATE INDEX "members_workspaceId_userId_idx" ON "members"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "session_token_userId_idx" ON "session"("token", "userId");

-- CreateIndex
CREATE INDEX "usages_userId_workspaceId_idx" ON "usages"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_userId_idx" ON "workspaces"("userId");
