import { invalidateBioPublicCache, invalidateMultipleBioPublicCache } from "./bio-public-cache";

// Cache invalidation triggers for bio updates
export class BioCacheInvalidator {
  // Invalidate cache when bio profile is updated
  static async invalidateOnProfileUpdate(username: string): Promise<void> {
    try {
      await invalidateBioPublicCache(username);
      console.log(`[Cache] Invalidated bio public cache for profile update: ${username}`);
    } catch (error) {
      console.error(`[Cache] Failed to invalidate cache for profile update: ${username}`, error);
    }
  }

  // Invalidate cache when bio links are updated
  static async invalidateOnLinksUpdate(username: string): Promise<void> {
    try {
      await invalidateBioPublicCache(username);
      console.log(`[Cache] Invalidated bio public cache for links update: ${username}`);
    } catch (error) {
      console.error(`[Cache] Failed to invalidate cache for links update: ${username}`, error);
    }
  }

  // Invalidate cache when bio socials are updated
  static async invalidateOnSocialsUpdate(username: string): Promise<void> {
    try {
      await invalidateBioPublicCache(username);
      console.log(`[Cache] Invalidated bio public cache for socials update: ${username}`);
    } catch (error) {
      console.error(`[Cache] Failed to invalidate cache for socials update: ${username}`, error);
    }
  }

  // Invalidate cache when bio theme is updated
  static async invalidateOnThemeUpdate(username: string): Promise<void> {
    try {
      await invalidateBioPublicCache(username);
      console.log(`[Cache] Invalidated bio public cache for theme update: ${username}`);
    } catch (error) {
      console.error(`[Cache] Failed to invalidate cache for theme update: ${username}`, error);
    }
  }

  // Invalidate cache when bio is deleted
  static async invalidateOnBioDelete(username: string): Promise<void> {
    try {
      await invalidateBioPublicCache(username);
      console.log(`[Cache] Invalidated bio public cache for bio deletion: ${username}`);
    } catch (error) {
      console.error(`[Cache] Failed to invalidate cache for bio deletion: ${username}`, error);
    }
  }

  // Invalidate cache for multiple users (e.g., when bulk operations occur)
  static async invalidateMultiple(usernames: string[]): Promise<void> {
    try {
      await invalidateMultipleBioPublicCache(usernames);
      console.log(`[Cache] Invalidated bio public cache for multiple users: ${usernames.length}`);
    } catch (error) {
      console.error(`[Cache] Failed to invalidate cache for multiple users`, error);
    }
  }

  // Invalidate cache when user account is updated (affects all their bios)
  static async invalidateOnUserUpdate(userId: string, usernames: string[]): Promise<void> {
    try {
      await invalidateMultipleBioPublicCache(usernames);
      console.log(`[Cache] Invalidated bio public cache for user update: ${userId} (${usernames.length} bios)`);
    } catch (error) {
      console.error(`[Cache] Failed to invalidate cache for user update: ${userId}`, error);
    }
  }

  // Invalidate cache when workspace settings change (affects all bios in workspace)
  static async invalidateOnWorkspaceUpdate(workspaceId: string, usernames: string[]): Promise<void> {
    try {
      await invalidateMultipleBioPublicCache(usernames);
      console.log(`[Cache] Invalidated bio public cache for workspace update: ${workspaceId} (${usernames.length} bios)`);
    } catch (error) {
      console.error(`[Cache] Failed to invalidate cache for workspace update: ${workspaceId}`, error);
    }
  }
}

// Convenience functions for common invalidation scenarios
export const invalidateBioCache = {
  profile: BioCacheInvalidator.invalidateOnProfileUpdate,
  links: BioCacheInvalidator.invalidateOnLinksUpdate,
  socials: BioCacheInvalidator.invalidateOnSocialsUpdate,
  theme: BioCacheInvalidator.invalidateOnThemeUpdate,
  delete: BioCacheInvalidator.invalidateOnBioDelete,
  multiple: BioCacheInvalidator.invalidateMultiple,
  user: BioCacheInvalidator.invalidateOnUserUpdate,
  workspace: BioCacheInvalidator.invalidateOnWorkspaceUpdate,
};

// The class is already exported above, no need to re-export
