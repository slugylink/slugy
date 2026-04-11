-- Reconcile PlanType enum drift caused by manual DB changes.
-- Safe to run on both states:
-- 1) enum has 'free' (rename to 'basic')
-- 2) enum already has 'basic' (no-op)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PlanType' AND e.enumlabel = 'free'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PlanType' AND e.enumlabel = 'basic'
  ) THEN
    ALTER TYPE "PlanType" RENAME VALUE 'free' TO 'basic';
  END IF;
END
$$;

ALTER TABLE "plans"
  ALTER COLUMN "planType" SET DEFAULT 'basic';
