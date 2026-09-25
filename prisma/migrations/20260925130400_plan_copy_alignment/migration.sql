-- Align stored plan marketing copy with enforcement semantics:
-- link quotas are velocity caps ("new links/month"), retention is bucket-exact
-- (Free 30 days / Pro 12 months / Business 24 months).

UPDATE "plans"
SET "features" = '["1 workspace", "10 new links/month", "1k tracked clicks/month", "Basic analytics", "Basic QR codes", "5 links/bio links", "1 user", "1 custom domain", "5 link tags", "5 UTM templates", "Community support"]'::jsonb
WHERE "planType" = 'free'::"PlanType";

UPDATE "plans"
SET "features" = '["3 workspaces", "250 new links/month", "10k tracked clicks/month", "Custom link preview", "Link expiration", "Password protection", "Geo targeting", "10 links/bio links", "Up to 2 team members", "10 link tags", "12 months analytics retention", "Priority email support", "3 custom domains", "10 UTM templates"]'::jsonb
WHERE "planType" = 'pro'::"PlanType";

UPDATE "plans"
SET "features" = '["10 workspaces", "1500 new links/month", "50k tracked clicks/month", "Custom link preview", "Link expiration", "Password protection", "Geo targeting", "30 links/bio links", "Up to 5 team members", "30 link tags", "24 months analytics retention", "Priority support", "10 custom domains", "30 UTM templates", "Bulk link creation"]'::jsonb
WHERE "planType" = 'business'::"PlanType";
