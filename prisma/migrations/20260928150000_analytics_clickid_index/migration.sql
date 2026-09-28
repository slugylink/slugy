-- Lead attribution fallback (resolveClickAttribution) looks Analytics up by
-- clickId for clicks older than the 90-day Redis window. Without this index
-- that lookup is a full scan on the largest table.
CREATE INDEX "analytics_clickId_idx" ON "analytics"("clickId");
