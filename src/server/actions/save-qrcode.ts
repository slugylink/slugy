"use server";

import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "../db";

interface SaveQrCodeParams {
  linkId: string;
  imageUrl: string;
  customization?: Record<string, unknown>;
}

export async function saveQrCode({
  linkId,
  imageUrl,
  customization,
}: SaveQrCodeParams) {
  try {
    const qrCode = await db.qrCode.upsert({
      where: { linkId },
      update: {
        imageUrl,
        customization: customization ? JSON.stringify(customization) : null,
        updatedAt: new Date(),
      },
      create: {
        linkId,
        imageUrl,
        customization: customization ? JSON.stringify(customization) : null,
      },
    });

    // Invalidate the cache for this specific QR code
    revalidateTag(`qr-code-${linkId}`, "/");

    return { success: true, qrCode };
  } catch (error) {
    console.error("Failed to save QR code:", error);
    return { success: false, error: "Failed to save QR code" };
  }
}

export async function getQrCode(linkId: string) {
  return unstable_cache(
    async (): Promise<Record<string, unknown> | null> => {
      try {
        const qrCode = await db.qrCode.findUnique({ where: { linkId } });
        if (qrCode?.customization) {
          return JSON.parse(qrCode.customization) as Record<string, unknown>;
        }
        return null;
      } catch (error) {
        console.error("Failed to get QR code:", error);
        return null;
      }
    },
    [`qr-code-${linkId}`],
    {
      tags: [`qr-code-${linkId}`],
      revalidate: 3600, // Cache for 1 hour
    }
  )();
}
