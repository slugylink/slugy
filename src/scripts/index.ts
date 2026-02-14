import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const FREE_PLAN = {
  name: "Free",
  description: "Get started with basic link shortening for personal use.",
  monthlyPrice: 0,
  yearlyPrice: 0,
  monthlyPriceId: "",
  yearlyPriceId: "",
  isRecommended: false,
  buttonLabel: "Start for free",
  isReady: true,
  yearlyDiscount: 0,
  planType: "free" as const,
  currency: "USD",
  interval: "month" as const,
  maxWorkspaces: 2,
  maxLinksPerWorkspace: 20,
  maxClicksPerWorkspace: 500,
  maxUsers: 1,
  maxCustomDomains: 2,
  maxGalleries: 1,
  maxLinksPerBio: 5,
  maxTagsPerWorkspace: 5,
  features: [
    "2 workspaces",
    "20 links/workspace",
    "500 tracked clicks/month",
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
  monthlyPrice: 8,
  yearlyPrice: 80,
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

    // Update existing plans by planType so subscriptions (FK) are not broken
    const free = await db.plan.findFirst({ where: { planType: "free" } });
    if (free) {
      await db.plan.update({ where: { id: free.id }, data: FREE_PLAN });
    } else {
      await db.plan.create({ data: FREE_PLAN });
    }

    const pro = await db.plan.findFirst({ where: { planType: "pro" } });
    if (pro) {
      await db.plan.update({ where: { id: pro.id }, data: PRO_PLAN });
    } else {
      await db.plan.create({ data: PRO_PLAN });
    }

    console.log("Seeded successfully");
  } catch (error) {
    console.log("Error while seeding: ", error);
  } finally {
    await db.$disconnect();
  }
}

main();
