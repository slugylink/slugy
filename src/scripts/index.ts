import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const BASIC_PLAN = {
  name: "Basic",
  description: "Great for genuine users who need essential link tools.",
  monthlyPrice: 1,
  yearlyPrice: 1,
  monthlyPriceId: process.env.NEXT_PUBLIC_BASIC_PRICE_ID || "",
  yearlyPriceId: process.env.NEXT_PUBLIC_BASIC_PRICE_ID || "",
  isRecommended: false,
  buttonLabel: "Get basic",
  isReady: true,
  yearlyDiscount: 0,
  planType: "basic" as const,
  currency: "USD",
  interval: "month" as const,
  maxWorkspaces: 2,
  maxLinksPerWorkspace: 20,
  maxClicksPerWorkspace: 1000,
  maxUsers: 1,
  maxCustomDomains: 2,
  maxGalleries: 1,
  maxLinksPerBio: 5,
  maxTagsPerWorkspace: 5,
  features: [
    "2 workspaces",
    "20 links/workspace",
    "1k tracked clicks/month",
    "Basic analytics",
    "Basic QR codes",
    "5 links/bio links",
    "5 link tags",
    "5 UTM templates",
    "1 user",
    "2 custom domains",
    "Community support",
  ],
};

const PRO_PLAN = {
  name: "Pro",
  description:
    "Perfect for individuals and small teams who need advanced features.",
  monthlyPrice: 10,
  yearlyPrice: 100,
  monthlyPriceId: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID || "",
  yearlyPriceId: process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID || "",
  isRecommended: true,
  buttonLabel: "Get pro",
  isReady: true,
  yearlyDiscount: 16.67,
  planType: "pro" as const,
  currency: "USD",
  interval: "month" as const,
  maxWorkspaces: 5,
  maxLinksPerWorkspace: 100,
  maxClicksPerWorkspace: 12000,
  maxUsers: 3,
  maxCustomDomains: 10,
  maxGalleries: 2,
  maxLinksPerBio: 15,
  maxTagsPerWorkspace: 15,
  features: [
    "5 workspaces",
    "100 links/workspace",
    "12k tracked clicks/month",
    "Custom link preview",
    "Link expiration",
    "Password protection",
    "15 links/bio links",
    "Up to 3 team members",
    "15 link tags",
    "12 months analytics retention",
    "10 custom domains",
    "Priority email support",
  ],
};

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
