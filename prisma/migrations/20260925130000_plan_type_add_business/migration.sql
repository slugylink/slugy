-- Add the Business ($29) tier.
-- NOTE: the business plan *row* is seeded in the follow-up migration because
-- Postgres requires new enum values to be committed before use.

ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'business';
