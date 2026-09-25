-- Shareable reports: let owners include lead conversions in the public report.
ALTER TABLE "shared_analytics" ADD COLUMN IF NOT EXISTS "showLeads" BOOLEAN NOT NULL DEFAULT false;
