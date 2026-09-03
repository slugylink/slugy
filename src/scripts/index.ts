import { PrismaClient } from "@prisma/client";
import {
  BASIC_PLAN as BASIC_PLAN_SOURCE,
  PRO_PLAN as PRO_PLAN_SOURCE,
  toPlanSeed,
} from "../constants/data/price";

const db = new PrismaClient();
const BASIC_PLAN = toPlanSeed(BASIC_PLAN_SOURCE);
const PRO_PLAN = toPlanSeed(PRO_PLAN_SOURCE);

async function main() {
  try {
    await db.$connect();

    // Transition old enum value if needed (free -> basic)
    await db.$executeRawUnsafe(`
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
    `);

    const upsertPlanByType = async (
      planType: "basic" | "pro",
      plan: typeof BASIC_PLAN | typeof PRO_PLAN,
    ) => {
      const rows = await db.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int AS count FROM "plans" WHERE "planType" = $1::"PlanType"`,
        planType,
      );
      const exists = Number(rows?.[0]?.count ?? 0) > 0;
      const featuresJson = JSON.stringify(plan.features);

      if (exists) {
        await db.$executeRawUnsafe(
          `
          UPDATE "plans"
          SET
            "name" = $1,
            "description" = $2,
            "monthlyPrice" = $3,
            "monthlyPriceId" = $4,
            "yearlyPrice" = $5,
            "yearlyPriceId" = $6,
            "yearlyDiscount" = $7,
            "currency" = $8,
            "interval" = $9::"Interval",
            "maxWorkspaces" = $10,
            "maxLinksPerWorkspace" = $11,
            "maxClicksPerWorkspace" = $12,
            "maxGalleries" = $13,
            "maxLinksPerBio" = $14,
            "maxUsers" = $15,
            "maxCustomDomains" = $16,
            "maxTagsPerWorkspace" = $17,
            "features" = $18::jsonb,
            "buttonLabel" = $19,
            "isReady" = $20,
            "isRecommended" = $21
          WHERE "planType" = $22::"PlanType"
          `,
          plan.name,
          plan.description,
          plan.monthlyPrice,
          plan.monthlyPriceId,
          plan.yearlyPrice,
          plan.yearlyPriceId,
          plan.yearlyDiscount,
          plan.currency,
          plan.interval,
          plan.maxWorkspaces,
          plan.maxLinksPerWorkspace,
          plan.maxClicksPerWorkspace,
          plan.maxGalleries,
          plan.maxLinksPerBio,
          plan.maxUsers,
          plan.maxCustomDomains,
          plan.maxTagsPerWorkspace,
          featuresJson,
          plan.buttonLabel,
          plan.isReady,
          plan.isRecommended,
          planType,
        );
      } else {
        await db.$executeRawUnsafe(
          `
          INSERT INTO "plans" (
            "name",
            "description",
            "monthlyPrice",
            "monthlyPriceId",
            "yearlyPrice",
            "yearlyPriceId",
            "yearlyDiscount",
            "planType",
            "currency",
            "interval",
            "maxWorkspaces",
            "maxLinksPerWorkspace",
            "maxClicksPerWorkspace",
            "maxGalleries",
            "maxLinksPerBio",
            "maxUsers",
            "maxCustomDomains",
            "maxTagsPerWorkspace",
            "features",
            "buttonLabel",
            "isReady",
            "isRecommended"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::"PlanType", $9, $10::"Interval",
            $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22
          )
          `,
          plan.name,
          plan.description,
          plan.monthlyPrice,
          plan.monthlyPriceId,
          plan.yearlyPrice,
          plan.yearlyPriceId,
          plan.yearlyDiscount,
          planType,
          plan.currency,
          plan.interval,
          plan.maxWorkspaces,
          plan.maxLinksPerWorkspace,
          plan.maxClicksPerWorkspace,
          plan.maxGalleries,
          plan.maxLinksPerBio,
          plan.maxUsers,
          plan.maxCustomDomains,
          plan.maxTagsPerWorkspace,
          featuresJson,
          plan.buttonLabel,
          plan.isReady,
          plan.isRecommended,
        );
      }
    };

    await upsertPlanByType("basic", BASIC_PLAN);
    await upsertPlanByType("pro", PRO_PLAN);

    console.log("Seeded successfully");
  } catch (error) {
    console.log("Error while seeding: ", error);
  } finally {
    await db.$disconnect();
  }
}

main();
