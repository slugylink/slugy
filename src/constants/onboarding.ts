export const ONBOARDING_USE_CASES = [
  { value: "sharing_links", label: "Sharing links" },
  { value: "marketing_campaigns", label: "Marketing / campaigns" },
  { value: "tracking_clicks", label: "Tracking clicks" },
  { value: "qr_codes", label: "QR codes" },
  { value: "bio_link", label: "Bio link" },
  { value: "exploring", label: "Just exploring" },
] as const;

export type OnboardingUseCaseValue =
  (typeof ONBOARDING_USE_CASES)[number]["value"];

export const ONBOARDING_USE_CASE_VALUES = ONBOARDING_USE_CASES.map(
  (option) => option.value,
) as [OnboardingUseCaseValue, ...OnboardingUseCaseValue[]];
