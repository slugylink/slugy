-- Schema correctness + index hygiene pass.
--
-- 1. user.banExpires INT -> TIMESTAMPTZ. better-auth's admin plugin types it
--    as Date; the Int column could never hold a real ban (writes would fail),
--    so the ban feature was silently broken. Zero non-null values exist, the
--    USING clause only converts hypothetically (assumed unix seconds).
-- 2. Missing hot-path indexes (auth lookups, FK joins, bio socials).
-- 3. Drop redundant indexes shadowed by UNIQUE/leftmost coverage.

-- AlterTable: banExpires type fix
ALTER TABLE "user" ALTER COLUMN "banExpires" TYPE TIMESTAMPTZ USING CASE WHEN "banExpires" IS NULL THEN NULL ELSE to_timestamp("banExpires") END;

-- CreateIndex: auth + FK hot paths
CREATE INDEX "account_userId_idx" ON "account"("userId");
CREATE INDEX "verification_identifier_value_idx" ON "verification"("identifier", "value");
CREATE INDEX "links_customDomainId_idx" ON "links"("customDomainId");
CREATE INDEX "custom_domains_workspaceId_idx" ON "custom_domains"("workspaceId");
CREATE INDEX "bio_socials_bioId_idx" ON "bio_socials"("bioId");

-- DropIndex: covered by UNIQUE or compound leftmost (dead write overhead)
DROP INDEX "session_token_idx";
DROP INDEX "invitations_token_idx";
DROP INDEX "members_workspaceId_idx";
DROP INDEX "links_slug_idx";
DROP INDEX "link_tags_linkId_idx";
DROP INDEX "bio_links_linkId_idx";
DROP INDEX "lead_customers_workspaceId_idx";
