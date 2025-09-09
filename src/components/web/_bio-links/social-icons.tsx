import {
  RiFacebookFill,
  RiInstagramLine,
  RiLinkedinFill,
  RiTwitterXFill,
  RiYoutubeFill,
  RiSnapchatFill,
} from "react-icons/ri";
import { LuMail } from "react-icons/lu";
import type { ComponentType } from "react";
import type { SocialPlatform } from "@/types/bio-links";

// Icon components for better server component compatibility
export const SOCIAL_ICON_COMPONENTS: Record<SocialPlatform, ComponentType<{ size?: number }>> = {
  facebook: RiFacebookFill,
  instagram: RiInstagramLine,
  twitter: RiTwitterXFill,
  linkedin: RiLinkedinFill,
  youtube: RiYoutubeFill,
  mail: LuMail,
  snapchat: RiSnapchatFill,
} as const;

// Helper function to get social icon component
export function getSocialIcon(platform: SocialPlatform, size: number = 20) {
  const IconComponent = SOCIAL_ICON_COMPONENTS[platform];
  return <IconComponent size={size} />;
}
