-- Rename the top paid tier Business -> Growth (same limits, same prices,
-- now purchasable). Postgres enum rename carries existing rows with it, so
-- no data backfill is needed; Polar product-name matching accepts both
-- "business" (legacy products) and "growth" (new products).
ALTER TYPE "PlanType" RENAME VALUE 'business' TO 'growth';
