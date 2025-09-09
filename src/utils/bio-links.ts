import { UTM_REF_PARAM, UTM_REF_VALUE } from "@/constants/bio-links";

/**
 * Adds UTM parameters to a URL with better error handling and performance
 * @param url - The URL to add UTM parameters to
 * @returns The URL with UTM parameters or the original URL if parsing fails
 */
export function addUTMParams(url: string): string {
  if (!url || typeof url !== "string") return url;

  try {
    const parsedUrl = new URL(url);
    // Only add if not already present to avoid duplicates
    if (!parsedUrl.searchParams.has(UTM_REF_PARAM)) {
      parsedUrl.searchParams.set(UTM_REF_PARAM, UTM_REF_VALUE);
    }
    return parsedUrl.toString();
  } catch (error) {
    console.warn("Failed to parse URL for UTM params:", url, error);
    return url;
  }
}

/**
 * Validates and formats email URLs
 * @param url - The email address or mailto URL
 * @returns Properly formatted mailto URL
 */
export function formatEmailUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("mailto:") ? url : `mailto:${url}`;
}

/**
 * Gets a safe display name for the gallery
 * @param name - The display name
 * @param username - The username fallback
 * @returns Safe display name
 */
export function getDisplayName(name: string | null, username: string): string {
  return name || `@${username}`;
}

/**
 * Generates avatar URL with fallback
 * @param logo - Custom logo URL
 * @param username - Username for default avatar
 * @returns Avatar URL
 */
export const DEFAULT_AVATAR_BASE = "https://avatar.vercel.sh";

export function getAvatarUrl(logo: string | null, username: string): string {
  return logo || `${DEFAULT_AVATAR_BASE}/${username}`;
}
