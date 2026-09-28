import { type NextRequest } from "next/server";
import { db } from "@/server/db";
import { jsonWithETag } from "@/lib/http";
import { getBioPublicCache } from "@/lib/cache-utils/bio-public-cache";
import {
  BIO_GALLERY_SELECT,
  normalizeBioUsername,
  transformCachedBioData,
  writePublicBioCache,
} from "@/server/public-bio-gallery";
import type { GalleryData } from "@/types/bio-links";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> },
) {
  const params = await context.params;
  const normalizedUsername = normalizeBioUsername(params.username);

  if (!normalizedUsername) {
    return jsonWithETag(
      request,
      { error: "Invalid username format" },
      { status: 400 },
    );
  }

  try {
    const cachedData = await getBioPublicCache(normalizedUsername);
    if (cachedData) {
      return jsonWithETag(request, transformCachedBioData(cachedData), {
        status: 200,
      });
    }

    const gallery: GalleryData | null = await db.bio.findFirst({
      where: { username: normalizedUsername, isPublic: true, deletedAt: null },
      select: BIO_GALLERY_SELECT,
    });

    if (!gallery) {
      return jsonWithETag(request, { error: "Bio gallery not found" }, 404);
    }

    writePublicBioCache(normalizedUsername, gallery);

    return jsonWithETag(request, gallery, {
      status: 200,
    });
  } catch (error) {
    console.error(
      `[Public Bio Gallery API] Error fetching ${normalizedUsername}:`,
      error,
    );

    try {
      const staleData = await getBioPublicCache(normalizedUsername);
      if (staleData) {
        return jsonWithETag(request, transformCachedBioData(staleData), {
          status: 200,
        });
      }
    } catch {
      // Ignore stale cache lookup failures.
    }

    return jsonWithETag(
      request,
      { error: "Failed to fetch bio gallery" },
      { status: 500 },
    );
  }
}
