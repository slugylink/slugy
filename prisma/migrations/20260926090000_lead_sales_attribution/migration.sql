-- Sales attribution on lead events (Business: sales analytics).
-- A sale is a lead event with sale_amount > 0.
ALTER TABLE "lead_events" ADD COLUMN IF NOT EXISTS "saleAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "lead_events" ADD COLUMN IF NOT EXISTS "saleCurrency" TEXT;

CREATE INDEX IF NOT EXISTS "lead_events_workspaceId_saleAmount_idx" ON "lead_events"("workspaceId", "saleAmount");
