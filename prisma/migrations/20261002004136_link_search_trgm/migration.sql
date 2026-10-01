-- Search performance: pg_trgm GIN indexes for ILIKE %term% on links.
-- B-tree cannot serve leading-wildcard ILIKE; trigram GIN can.
-- CONCURRENTLY avoided: Prisma migrations run in a transaction.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "links_slug_trgm_idx" ON "links" USING gin ("slug" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "links_url_trgm_idx" ON "links" USING gin ("url" gin_trgm_ops);
