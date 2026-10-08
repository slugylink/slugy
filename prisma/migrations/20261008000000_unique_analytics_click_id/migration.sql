-- Retain one canonical row per click before enforcing retry idempotency.
DELETE FROM "analytics" a USING "analytics" b
WHERE a."clickId" IS NOT NULL AND a."clickId" = b."clickId"
  AND (a."clickedAt", a.id) > (b."clickedAt", b.id);
DROP INDEX IF EXISTS "analytics_clickId_idx";
CREATE UNIQUE INDEX "analytics_clickId_key" ON "analytics"("clickId");
