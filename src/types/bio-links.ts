import type { BioLinks, BioSocials } from "@prisma/client";
import type { ReactNode } from "react";

// Enhanced Theme type with better type safety
export type Theme = {
  readonly id: string;
  readonly name: string;
  readonly background: string;
  readonly buttonStyle: string;
  readonly textColor: string;
  readonly accentColor: string;
  /**
   * Optional rotating button colors (e.g. neo-brutalist multi-color links).
   * When set, link cards cycle through these classes one per link.
   */
  readonly buttonPalette?: readonly string[];
};

// Utility types for better type safety
export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "snapchat"
  | "tiktok"
  | "github"
  | "discord"
  | "telegram"
  | "whatsapp"
  | "reddit"
  | "twitch"
  | "spotify"
  | "behance"
  | "dribbble"
  | "medium"
  | "substack"
  | "threads"
  | "mastodon"
  | "bluesky"
  | "xing"
  | "stackoverflow"
  | "producthunt"
  | "devto"
  | "hashnode"
  | "gitlab"
  | "bitbucket"
  | "tumblr"
  | "vimeo"
  | "website";

export type SocialPlatformConfig = {
  readonly iconName: string;
  readonly isMail: boolean;
};

// Cached data structure for better type safety
export type CachedBioData = {
  readonly username: string;
  readonly name: string | null;
  readonly bio: string | null;
  readonly logo: string | null;
  readonly theme: string | null;
  readonly links: readonly CachedLink[];
  readonly socials: readonly CachedSocial[];
  readonly images?: readonly CachedGalleryImage[];
};

export type CachedGalleryImage = {
  readonly id: string;
  readonly image: string;
  readonly position: number;
  readonly isPublic: boolean;
};

export type CachedLink = {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly style?: string | null;
  readonly icon?: string | null;
  readonly image?: string | null;
  readonly position: number;
  readonly isPublic: boolean;
  readonly linkId?: string | null;
  readonly clicks?: number;
  readonly shortSlug?: string | null;
  readonly shortDomain?: string | null;
};

export type CachedSocial = {
  readonly platform: string;
  readonly url: string;
  readonly isPublic: boolean;
};

export type PublicBioLink = Pick<
  BioLinks,
  "id" | "title" | "url" | "style" | "icon" | "image" | "position" | "isPublic"
> &
  Partial<Pick<BioLinks, "linkId" | "clicks">> & {
    shortSlug?: string | null;
    shortDomain?: string | null;
    link?: { slug: string; domain: string } | null;
  };

export type PublicBioSocial = Pick<BioSocials, "platform" | "url" | "isPublic">;

export type PublicGalleryImage = {
  id: string;
  image: string;
  position: number;
  isPublic: boolean;
};

export type EditorBioLink = {
  id: string;
  title: string;
  url: string;
  style?: string | null;
  icon?: string | null;
  image?: string | null;
  isPublic: boolean;
  position: number;
  clicks: number;
  galleryId: string;
  linkId?: string | null;
  linkManagedByBio?: boolean;
};

export type EditorGallery = {
  links: EditorBioLink[];
  username: string;
  name?: string | null;
  bio?: string | null;
  logo?: string | null;
  isPublic: boolean;
  socials?: PublicBioSocial[];
  images?: PublicGalleryImage[];
  theme?: string | Theme | null;
};

// Gallery data structure returned from public API
export type GalleryData = {
  readonly username: string;
  readonly name: string | null;
  readonly bio: string | null;
  readonly logo: string | null;
  readonly theme: string | null;
  readonly links: PublicBioLink[];
  readonly socials: PublicBioSocial[];
  readonly images: PublicGalleryImage[];
};

// Props for reusable components with strict typing
export type SocialLinksProps = {
  socials: PublicBioSocial[];
  theme: Theme;
  variant?: "default" | "header";
};

export type BioLinksProps = {
  readonly links: readonly PublicBioLink[];
  readonly theme: Theme;
  /** Show per-link click counts (editor previews only — never public pages). */
  readonly showClicks?: boolean;
  /**
   * Root origin for workspace short links, computed server-side from the
   * request host. When provided, cards render the final href on first paint
   * (no client-side origin lookup + re-render). Falls back to a
   * window.location lookup when omitted.
   */
  readonly shortOrigin?: string | null;
};

export type ProfileSectionProps = {
  readonly name: string | null;
  readonly username: string;
  readonly bio: string | null;
  readonly theme: Theme;
  readonly children?: ReactNode;
  readonly avatarUrl?: string;
  readonly avatarOverlay?: ReactNode;
  /** Optional action (e.g. edit button) rendered beside the display name. */
  readonly nameAction?: ReactNode;
};

export type GalleryFooterProps = {
  readonly theme: Theme;
};

// Metadata generation types
export type GalleryMetadataInput = {
  readonly name: string | null;
  readonly bio: string | null;
  readonly username: string;
};

// Error handling types
export type GalleryFetchResult<T = GalleryData> =
  | { success: true; data: T }
  | { success: false; error: string; fallbackData?: T };

// Utility type for component state
export type ComponentState = "idle" | "loading" | "error" | "success";
