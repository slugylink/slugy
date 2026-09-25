-- Seed the Free plan row idempotently (limits mirror FREE_PLAN in price.ts).

INSERT INTO "plans" (
  "id",
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
  "maxUtmTemplates",
  "features",
  "buttonLabel",
  "isReady",
  "isRecommended"
)
SELECT
  'free-plan',
  'Free',
  'Perfect for trying Slugy. Upgrade when you grow.',
  0, NULL, 0, NULL, 0,
  'free'::"PlanType",
  'USD',
  'month'::"Interval",
  1, 10, 1000, 1, 5, 1, 0, 5, 5,
  '["1 workspace", "10 links/workspace", "1k tracked clicks/month", "Basic analytics", "Basic QR codes", "5 links/bio links", "1 user", "5 link tags", "5 UTM templates", "Community support"]'::jsonb,
  'Get Started',
  true,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM "plans" WHERE "planType" = 'free'::"PlanType"
);
