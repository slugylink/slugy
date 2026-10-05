import type { LucideIcon } from "lucide-react";
import { Plug } from "lucide-react";

export interface ProviderBrand {
  /** Local brand mark under /public/icons. Preferred over Icon. */
  src?: string;
  /** Neutral fallback glyph when no brand mark exists. */
  Icon?: LucideIcon;
  /** Monochrome marks (e.g. Polar) need inversion on dark backgrounds. */
  invertOnDark?: boolean;
}

/**
 * Single source of truth for provider logos. Real brand SVGs live in
 * /public/icons so marketing and product never drift apart.
 */
export const PROVIDER_BRANDING: Record<string, ProviderBrand> = {
  slack: { src: "/icons/slack.svg" },
  zapier: { src: "/icons/zapier.svg" },
  make: { src: "/icons/make.svg" },
  polar: { src: "/icons/polar.svg", invertOnDark: true },
  shopify: { src: "/icons/shopify.svg" },
  wordpress: { src: "/icons/wordpress.svg" },
  stripe: { src: "/icons/stripe.svg" },
  segment: { src: "/icons/segment.svg" },
};

export const FALLBACK_BRAND: ProviderBrand = { Icon: Plug };

export function brandFor(provider: string): ProviderBrand {
  return PROVIDER_BRANDING[provider] ?? FALLBACK_BRAND;
}
