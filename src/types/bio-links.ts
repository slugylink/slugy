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
};

// Utility types for better type safety
export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "mail"
  | "snapchat";

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
};

export type CachedSocial = {
  readonly platform: string;
  readonly url: string;
  readonly isPublic: boolean;
};

// Gallery data structure returned from database
export type GalleryData = {
  readonly username: string;
  readonly name: string | null;
  readonly bio: string | null;
  readonly logo: string | null;
  readonly theme: string | null;
  readonly links: BioLinks[];
  readonly socials: BioSocials[];
};

// Props for reusable components with strict typing
export type SocialLinksProps = {
  readonly socials: readonly BioSocials[];
  readonly theme: Theme;
};

export type BioLinksProps = {
  readonly links: readonly BioLinks[];
  readonly theme: Theme;
};

export type ProfileSectionProps = {
  readonly name: string | null;
  readonly username: string;
  readonly bio: string | null;
  readonly theme: Theme;
  readonly children?: ReactNode;
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
