import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  try {
    await db.$connect();

    // Clear existing plans to avoid duplicates during re-seeding
    await db.plan.deleteMany({});

    await db.plan.createMany({
      data: [
        {
          name: "Free",
          description:
            "Get started with basic link shortening for personal use.",
          monthlyPrice: 0,
          yearlyPrice: 0,
          monthlyPriceId: "",
          yearlyPriceId: "",
          isRecommended: false,
          buttonLabel: "Start for free",
          isReady: true,
          yearlyDiscount: 0,
          planType: "free",
          currency: "USD",
          interval: "month",
          maxWorkspaces: 2,
          maxLinksPerWorkspace: 30,
          maxClicksPerWorkspace: 1000,
          maxUsers: 1,
          maxCustomDomains: 0,
          features: [
            "2 workspaces",
            "30 links/workspace",
            "1k tracked clicks/month",
            "Advanced analytics",
            "Basic QR codes",
            "5 links/link-in-bio",
            "5 link tags",
            "5 UTM templates",
            "1 user",
            "Community support",
          ],
        },
        {
          name: "Pro",
          description:
            "Perfect for individuals and small teams who need advanced features.",
          monthlyPrice: 7,
          yearlyPrice: 70,
          monthlyPriceId: process.env.NEXT_PUBLIC_PRO_MONTH_PRICE_ID || "",
          yearlyPriceId: process.env.NEXT_PUBLIC_PRO_YEAR_PRICE_ID || "",
          isRecommended: true,
          buttonLabel: "Get pro",
          isReady: true,
          yearlyDiscount: 16.7,
          planType: "pro",
          currency: "USD",
          interval: "month",
          maxWorkspaces: 8,
          maxLinksPerWorkspace: 100,
          maxClicksPerWorkspace: 15000,
          maxUsers: 3,
          maxCustomDomains: 1,
          features: [
            "8 workspaces",
            "100 links/workspace",
            "15k tracked clicks/month",
            "Advanced analytics & insights",
            "Custom link preview",
            "Custom QR codes with branding",
            "Link expiration",
            "Password protection",
            "15 links/link-in-bio",
            "Up to 3 team members",
            "15 link tags",
            "15 UTM templates",
            "1-year analytics retention",
            "Priority email support",
            "1 custom domain",
          ],
        },
      ],
    });

    console.log("Seeded successfully");
  } catch (error) {
    console.log("Error while seeding: ", error);
  } finally {
    await db.$disconnect();
  }
}

main();
