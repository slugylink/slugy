import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Constants
const TEMP_LINK_SUFFIX = "&c";
const MIN_CODE_LENGTH = 6;
const LINK_EXPIRY_SECONDS = 15 * 60; // 15 minutes

// Type definitions
interface LinkData {
  url: string;
  code: string;
  ip: string;
  createdAt: string;
  expiresAt: string;
  clicks?: number;
}

// Utility functions
const isTempLink = (shortCode: string): boolean => {
  return shortCode.endsWith(TEMP_LINK_SUFFIX);
};

const extractCode = (shortCode: string): string | null => {
  // Since we already check for "&c" suffix, we can safely remove it
  const code = shortCode.slice(0, -2); // Remove last 2 characters ("&c")
  return code.length >= MIN_CODE_LENGTH ? code : null;
};

const isLinkExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) <= new Date();
};

const parseLinkData = (linkData: unknown): LinkData | null => {
  try {
    if (typeof linkData === "string") {
      return JSON.parse(linkData) as LinkData;
    }
    return linkData as LinkData;
  } catch (error) {
    console.error("Error parsing temp link data:", error);
    return null;
  }
};

const cleanupExpiredLink = async (
  linkKey: string,
  code: string,
  ip: string,
): Promise<void> => {
  try {
    await Promise.all([redis.del(linkKey), redis.srem(`temp:ip:${ip}`, code)]);
  } catch (error) {
    console.error("Error cleaning up expired link:", error);
  }
};

const updateClickCount = async (
  linkKey: string,
  data: LinkData,
): Promise<void> => {
  try {
    const currentClicks = data.clicks || 0;
    const updatedData = {
      ...data,
      clicks: currentClicks + 1,
    };

    // Preserve the ORIGINAL remaining TTL — re-setting the full window on
    // every hit made popular temp links immortal. Keys without a TTL
    // (legacy) get the standard window instead of living forever.
    const ttl = await redis.ttl(linkKey);
    if (ttl === -2) return; // Key vanished mid-flight — don't resurrect it.
    const ex = typeof ttl === "number" && ttl > 0 ? ttl : LINK_EXPIRY_SECONDS;
    await redis.set(linkKey, JSON.stringify(updatedData), { ex });
  } catch (error) {
    console.error("Error updating click count:", error);
  }
};

export async function handleTempRedirect(
  req: NextRequest,
  shortCode: string,
): Promise<NextResponse | null> {
  try {
    if (!isTempLink(shortCode)) {
      return null;
    }

    const code = extractCode(shortCode);
    if (!code) {
      return null;
    }

    // Get link data from Redis
    const linkKey = `temp:link:${code}`;
    const linkData = await redis.get(linkKey);

    if (!linkData) {
      return null;
    }

    // Parse link data
    const data = parseLinkData(linkData);
    if (!data) {
      return null;
    }

    // Check expiration
    if (isLinkExpired(data.expiresAt)) {
      await cleanupExpiredLink(linkKey, code, data.ip);
      return null;
    }

    updateClickCount(linkKey, data).catch((error) => {
      console.error("Failed to update click count:", error);
    });

    const response = NextResponse.redirect(data.url, 302);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("Temp redirect error:", error);
    return null;
  }
}
