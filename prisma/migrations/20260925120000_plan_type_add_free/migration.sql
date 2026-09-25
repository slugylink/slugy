-- Reintroduce the Free ($0) plan tier for acquisition.
-- Adds 'free' back to the PlanType enum (basic/pro rows untouched).
-- NOTE: the free plan *row* is seeded in the follow-up migration because
-- Postgres requires new enum values to be committed before use.

ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'free';
