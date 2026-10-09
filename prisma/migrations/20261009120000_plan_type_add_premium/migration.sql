-- Commit the enum value before seeding the Premium plan.
ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'premium';
