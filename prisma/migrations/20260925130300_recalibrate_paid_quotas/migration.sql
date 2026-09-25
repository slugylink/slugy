-- Profit-oriented quota recalibration (see competitor research: Dub Pro $30 =
-- 50K events/mo, Bitly Growth $29 = 500 links/mo + 4 months data, Rebrandly
-- Essentials ~$13 = 250 links + 10K clicks + 2 domains).
--
-- Pro $8: match Rebrandly Essentials volume, beat it on domains (3 vs 2).
-- Business $29: match Dub Pro events (50K) and Rebrandly Pro links (1500),
-- beat Bitly Growth on volume + retention at the same price.

UPDATE "plans"
SET
  "maxWorkspaces" = 3,
  "maxLinksPerWorkspace" = 250,
  "maxClicksPerWorkspace" = 10000,
  "maxGalleries" = 2,
  "maxLinksPerBio" = 10,
  "maxUsers" = 2,
  "maxCustomDomains" = 3,
  "maxTagsPerWorkspace" = 10,
  "maxUtmTemplates" = 10,
  "features" = '["3 workspaces", "250 links/workspace", "10k tracked clicks/month", "Custom link preview", "Link expiration", "Password protection", "Geo targeting", "10 links/bio links", "Up to 2 team members", "10 link tags", "6 months analytics retention", "Priority email support", "3 custom domains", "10 UTM templates"]'::jsonb
WHERE "planType" = 'pro'::"PlanType";

UPDATE "plans"
SET
  "maxWorkspaces" = 10,
  "maxLinksPerWorkspace" = 1500,
  "maxClicksPerWorkspace" = 50000,
  "maxGalleries" = 5,
  "maxLinksPerBio" = 30,
  "maxUsers" = 5,
  "maxCustomDomains" = 10,
  "maxTagsPerWorkspace" = 30,
  "maxUtmTemplates" = 30,
  "features" = '["10 workspaces", "1500 links/workspace", "50k tracked clicks/month", "Custom link preview", "Link expiration", "Password protection", "Geo targeting", "30 links/bio links", "Up to 5 team members", "30 link tags", "12 months analytics retention", "Priority support", "10 custom domains", "30 UTM templates", "Bulk link creation"]'::jsonb
WHERE "planType" = 'business'::"PlanType";
