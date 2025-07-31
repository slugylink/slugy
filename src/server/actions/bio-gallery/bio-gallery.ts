"use server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { checkBioGalleryLimit } from "../limit";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache";

//* Server action to create bio gallery
export async function createBioGallery({
  username,
  isDefault = true,
}: {
  username: string;
  isDefault?: boolean;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;
    // Check if username already exists
    const existingBio = await db.bio.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existingBio) {
      return {
        success: false,
        error: "Bio gallery username already exists!",
        usernameExists: true,
      };
    }
    // Check bio gallery limits before creating
    const limitCheck = await checkBioGalleryLimit(userId);
    if (!limitCheck.canCreate) {
      return {
        success: false,
        error: limitCheck.message,
        limitInfo: {
          currentCount: limitCheck.currentCount,
          maxLimit: limitCheck.maxLimit,
          planType: limitCheck.planType,
        },
      };
    }
    const bio = await db.$transaction(async (tx) => {
      // If this bio is being set as default, remove default from all other bios
      if (isDefault) {
        await tx.bio.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const bio = await tx.bio.create({
        data: {
          userId,
          username,
          isDefault: isDefault,
        },
      });
      return {
        id: bio.id,
        username: bio.username,
      };
    });

    // Invalidate bio cache after creation
    await invalidateBioCache(userId);

    return { success: true, username: bio.username };
  } catch (error) {
    console.error("Error creating bio gallery:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
