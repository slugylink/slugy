export const SLUGY_ID_PARAM = "slugy_id";
export const SLUGY_ID_COOKIE = "slugy_id";
export const SLUGY_ID_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
export const CLICK_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;
export const CLICK_CACHE_KEY_PREFIX = "slugy:click:";

export function clickCacheKey(clickId: string): string {
  return `${CLICK_CACHE_KEY_PREFIX}${clickId}`;
}
