import { revalidateTag } from "next/cache";

/**
 * Invalidate link cache when links are updated
 * This function can only be used in Server Components or API routes
 */
export function invalidateLinkCache(slug?: string) {
  revalidateTag("link");
  revalidateTag("link-redirect");
  if (slug) {
    revalidateTag(`link-by-slug-${slug}`);
  }
} 