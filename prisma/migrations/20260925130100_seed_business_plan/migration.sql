-- Seed the Business plan row idempotently (limits mirror BUSINESS_PLAN in price.ts).
-- Price IDs are wired via env (NEXT_PUBLIC_BUSINESS_MONTHLY/YEARLY_PRICE_ID) by the seed script.

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
  'business-plan',
  'Business',
  'For teams and agencies running links at scale.',
  29, NULL, 290, NULL, 16.67,
  'business'::"PlanType",
  'USD',
  'month'::"Interval",
  20, 1000, 100000, 10, 50, 10, 30, 50, 50,
  '["20 workspaces", "1000 links/workspace", "100k tracked clicks/month", "Custom link preview", "Link expiration", "Password protection", "Geo targeting", "50 links/bio links", "Up to 10 team members", "50 link tags", "24 months analytics retention", "Priority support", "30 custom domains", "50 UTM templates"]'::jsonb,
  'Get Business',
  true,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM "plans" WHERE "planType" = 'business'::"PlanType"
);
