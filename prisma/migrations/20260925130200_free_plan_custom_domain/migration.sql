-- Free plan now includes 1 custom domain (acquisition hook).

UPDATE "plans"
SET
  "maxCustomDomains" = 1,
  "features" = '["1 workspace", "10 links/workspace", "1k tracked clicks/month", "Basic analytics", "Basic QR codes", "5 links/bio links", "1 user", "1 custom domain", "5 link tags", "5 UTM templates", "Community support"]'::jsonb
WHERE "planType" = 'free'::"PlanType";
