import type { SocialPlatform, SocialPlatformConfig } from "@/types/bio-links";

// Constants for bio-links functionality
export const DEFAULT_AVATAR_BASE = "https://avatar.vercel.sh" as const;
export const DEFAULT_THEME_ID = "default" as const;
export const UTM_REF_PARAM = "ref" as const;
export const UTM_REF_VALUE = "slugy.co" as const;
export const CANONICAL_BASE = "https://bio.slugy.co" as const;

export const OPENGRAPH_IMAGE_URL =
  "https://opengraph.b-cdn.net/production/images/1160136e-9ad9-49c3-832c-80392cf860d7.png?token=Tk-p0tmXKfat-A7zU1aov_tcgG82lYmfeLr-zxR1LpI&height=630&width=1200&expires=33289246448" as const;

// Social platform configuration for better maintainability
export const SOCIAL_PLATFORMS: Record<SocialPlatform, SocialPlatformConfig> = {
  facebook: { iconName: "RiFacebookFill", isMail: false },
  instagram: { iconName: "RiInstagramLine", isMail: false },
  twitter: { iconName: "RiTwitterXFill", isMail: false },
  linkedin: { iconName: "RiLinkedinFill", isMail: false },
  youtube: { iconName: "RiYoutubeFill", isMail: false },
  // mail: { iconName: "LuMail", isMail: true },
  snapchat: { iconName: "RiSnapchatFill", isMail: false },
  tiktok: { iconName: "RiTiktokFill", isMail: false },
  github: { iconName: "RiGithubFill", isMail: false },
  discord: { iconName: "RiDiscordFill", isMail: false },
  telegram: { iconName: "RiTelegramFill", isMail: false },
  whatsapp: { iconName: "RiWhatsappFill", isMail: false },
  reddit: { iconName: "RiRedditFill", isMail: false },
  // pinterest: { iconName: "RiPinterestFill", isMail: false },
  twitch: { iconName: "RiTwitchFill", isMail: false },
  spotify: { iconName: "RiSpotifyFill", isMail: false },
  behance: { iconName: "RiBehanceFill", isMail: false },
  dribbble: { iconName: "RiDribbbleFill", isMail: false },
  medium: { iconName: "RiMediumFill", isMail: false },
  substack: { iconName: "SiSubstack", isMail: false },
  threads: { iconName: "RiThreadsFill", isMail: false },
  mastodon: { iconName: "RiMastodonFill", isMail: false },
  bluesky: { iconName: "SiBluesky", isMail: false },
  xing: { iconName: "SiXing", isMail: false },
  stackoverflow: { iconName: "RiStackOverflowFill", isMail: false },
  producthunt: { iconName: "SiProducthunt", isMail: false },
  devto: { iconName: "SiDevdotto", isMail: false },
  hashnode: { iconName: "SiHashnode", isMail: false },
  gitlab: { iconName: "RiGitlabFill", isMail: false },
  bitbucket: { iconName: "RiBitbucketFill", isMail: false },
  tumblr: { iconName: "RiTumblrFill", isMail: false },
  vimeo: { iconName: "RiVimeoFill", isMail: false },
  website: { iconName: "CgWebsite", isMail: false },
} as const;
