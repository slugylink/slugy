import { redis } from "@/lib/redis";
import { METADATA_BOT_PATTERNS } from "@/lib/middleware/bot-patterns";

export function scoreTraffic(
  userAgent: string,
  isDuplicate: boolean,
  trigger?: string,
) {
  const ua = userAgent.toLowerCase();
  const isBot =
    trigger === "bot" ||
    METADATA_BOT_PATTERNS.some((pattern) =>
      ua.includes(pattern.toLowerCase()),
    ) ||
    /googlebot/i.test(ua);
  return {
    isBot,
    isDuplicate,
    qualityScore: isBot ? 0 : isDuplicate ? 25 : 100,
  };
}

export async function clickQuality(
  linkId: string,
  clickId: string,
  ip: string,
  ua: string,
  trigger: string,
) {
  // Hash identifiers: never place raw IP addresses or user agents in Redis keys.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([linkId, clickId, ip, ua])),
  );
  const key = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  try {
    const first = await redis.set(`campaign:quality:${key}`, "1", {
      nx: true,
      ex: 30,
    });
    return scoreTraffic(ua, first === null, trigger);
  } catch {
    return { ...scoreTraffic(ua, false, trigger), qualityScore: null };
  }
}
