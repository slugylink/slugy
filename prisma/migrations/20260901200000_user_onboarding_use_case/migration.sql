-- Store why a new user signed up so onboarding can stay one question.
CREATE TYPE "OnboardingUseCase" AS ENUM (
  'sharing_links',
  'marketing_campaigns',
  'tracking_clicks',
  'qr_codes',
  'bio_link',
  'exploring'
);

ALTER TABLE "user" ADD COLUMN "intendedUse" "OnboardingUseCase";
