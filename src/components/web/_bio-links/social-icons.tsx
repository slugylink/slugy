import type { ComponentType } from "react";
import { RiLinkM } from "react-icons/ri";
import type { SocialPlatform } from "@/types/bio-links";
import { BIO_SOCIAL_ICON_MAP } from "@/constants/data/bio-icons";

const FALLBACK_ICON: ComponentType<{ size?: number }> = RiLinkM;

function resolveIcon(
  platform: SocialPlatform,
): ComponentType<{ size?: number }> {
  return BIO_SOCIAL_ICON_MAP[platform]?.icon ?? FALLBACK_ICON;
}

// Resolve icons through a guarded accessor so missing icon definitions
// never crash module evaluation.
export const SOCIAL_ICON_COMPONENTS: Record<
  SocialPlatform,
  ComponentType<{ size?: number }>
> = {
  facebook: resolveIcon("facebook"),
  instagram: resolveIcon("instagram"),
  twitter: resolveIcon("twitter"),
  linkedin: resolveIcon("linkedin"),
  youtube: resolveIcon("youtube"),
  snapchat: resolveIcon("snapchat"),
  tiktok: resolveIcon("tiktok"),
  github: resolveIcon("github"),
  discord: resolveIcon("discord"),
  telegram: resolveIcon("telegram"),
  whatsapp: resolveIcon("whatsapp"),
  reddit: resolveIcon("reddit"),
  twitch: resolveIcon("twitch"),
  spotify: resolveIcon("spotify"),
  behance: resolveIcon("behance"),
  dribbble: resolveIcon("dribbble"),
  medium: resolveIcon("medium"),
  substack: resolveIcon("substack"),
  threads: resolveIcon("threads"),
  mastodon: resolveIcon("mastodon"),
  bluesky: resolveIcon("bluesky"),
  xing: resolveIcon("xing"),
  stackoverflow: resolveIcon("stackoverflow"),
  producthunt: resolveIcon("producthunt"),
  devto: resolveIcon("devto"),
  hashnode: resolveIcon("hashnode"),
  gitlab: resolveIcon("gitlab"),
  bitbucket: resolveIcon("bitbucket"),
  tumblr: resolveIcon("tumblr"),
  vimeo: resolveIcon("vimeo"),
  website: resolveIcon("website"),
} as const;

export function getSocialIcon(platform: SocialPlatform, size: number = 20) {
  const IconComponent = SOCIAL_ICON_COMPONENTS[platform] ?? FALLBACK_ICON;
  return <IconComponent size={size} />;
}
