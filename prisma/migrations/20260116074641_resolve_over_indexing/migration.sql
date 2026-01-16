-- DropIndex
DROP INDEX "analytics_browser_idx";

-- DropIndex
DROP INDEX "analytics_city_idx";

-- DropIndex
DROP INDEX "analytics_clickedAt_browser_idx";

-- DropIndex
DROP INDEX "analytics_clickedAt_city_idx";

-- DropIndex
DROP INDEX "analytics_clickedAt_continent_idx";

-- DropIndex
DROP INDEX "analytics_clickedAt_country_idx";

-- DropIndex
DROP INDEX "analytics_clickedAt_device_idx";

-- DropIndex
DROP INDEX "analytics_clickedAt_linkId_idx";

-- DropIndex
DROP INDEX "analytics_clickedAt_os_idx";

-- DropIndex
DROP INDEX "analytics_clickedAt_referer_idx";

-- DropIndex
DROP INDEX "analytics_continent_idx";

-- DropIndex
DROP INDEX "analytics_country_idx";

-- DropIndex
DROP INDEX "analytics_device_idx";

-- DropIndex
DROP INDEX "analytics_os_idx";

-- DropIndex
DROP INDEX "analytics_referer_idx";

-- DropIndex
DROP INDEX "links_description_idx";

-- DropIndex
DROP INDEX "links_slug_domain_idx";

-- DropIndex
DROP INDEX "links_url_idx";

-- DropIndex
DROP INDEX "links_userId_idx";

-- DropIndex
DROP INDEX "links_workspaceId_id_idx";

-- DropIndex
DROP INDEX "links_workspaceId_isArchived_idx";

-- DropIndex
DROP INDEX "links_workspaceId_slug_domain_idx";

-- DropIndex
DROP INDEX "links_workspaceId_slug_idx";

-- DropIndex
DROP INDEX "members_workspaceId_userId_idx";

-- DropIndex
DROP INDEX "organizations_slug_idx";

-- DropIndex
DROP INDEX "qr_codes_linkId_idx";

-- DropIndex
DROP INDEX "session_token_userId_idx";

-- DropIndex
DROP INDEX "shared_analytics_publicId_idx";

-- DropIndex
DROP INDEX "tags_name_idx";

-- DropIndex
DROP INDEX "workspace_api_keys_key_idx";

-- DropIndex
DROP INDEX "workspaces_userId_idx";

-- DropIndex
DROP INDEX "workspaces_userId_slug_idx";

-- CreateIndex
CREATE INDEX "session_token_idx" ON "session"("token");
