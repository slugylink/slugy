"use server";

import { unstable_cache } from "next/cache";

interface SafeBrowsingClient {
  clientId: string;
  clientVersion: string;
}

interface ThreatInfo {
  threatTypes: string[];
  platformTypes: string[];
  threatEntryTypes: string[];
  threatEntries: Array<{ url: string }>;
}

interface SafeBrowsingRequest {
  client: SafeBrowsingClient;
  threatInfo: ThreatInfo;
}

interface ThreatMatch {
  threatType: string;
  platformType: string;
  threatEntryType: string;
  threat: { url: string };
  cacheDuration: string;
}

interface SafeBrowsingResponse {
  matches?: ThreatMatch[];
}

interface UrlScanResult {
  isSafe: boolean;
  threats: string[];
  error?: string;
}

// --------------------------------------------------------------------------------
// Actual scan logic
async function fetchUrlSafety(url: string): Promise<UrlScanResult> {
  if (!url) return { isSafe: false, threats: [], error: "URL is required" };

  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    console.warn("Google Safe Browsing API key not configured");
    return { isSafe: true, threats: [], error: "API key not configured" };
  }

  const normalizedUrl = url.trim().match(/^https?:\/\//)
    ? url.trim()
    : `https://${url.trim()}`;

  const requestBody: SafeBrowsingRequest = {
    client: {
      clientId: process.env.GOOGLE_SAFE_BROWSING_CLIENT_ID!,
      clientVersion: "1.0",
    },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url: normalizedUrl }],
    },
  };

  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        // Make sure not to use Next.js fetch cache here
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data: SafeBrowsingResponse = await response.json();

    if (!data.matches?.length) {
      return { isSafe: true, threats: [] };
    }

    return { isSafe: false, threats: data.matches.map((m) => m.threatType) };
  } catch (error) {
    console.error("Error scanning URL:", error);
    return {
      isSafe: true,
      threats: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// --------------------------------------------------------------------------------
// This creates a cached wrapper around fetchUrlSafety using unstable_cache
const cachedScanUrlSafety = unstable_cache(
  async (url: string) => fetchUrlSafety(url),
  ["scan-url-safety"], // global cache key namespace
  { revalidate: 300 }, // revalidate every 300 seconds (5 minutes)
);

export async function scanUrlSafety(url: string) {
  // We pass the URL as part of the key to differentiate results
  return cachedScanUrlSafety(url);
}

// --------------------------------------------------------------------------------
// Validation wrapper
export async function validateUrlSafety(url: string): Promise<{
  isValid: boolean;
  message?: string;
  threats?: string[];
}> {
  const result = await scanUrlSafety(url);

  if (result.error && result.error !== "API key not configured") {
    return {
      isValid: false,
      message: "Unable to verify URL safety. Please try again.",
    };
  }

  if (!result.isSafe) {
    const prettyThreats = result.threats.map((t) => {
      switch (t) {
        case "MALWARE":
          return "malware";
        case "SOCIAL_ENGINEERING":
          return "phishing";
        case "UNWANTED_SOFTWARE":
          return "unwanted software";
        case "POTENTIALLY_HARMFUL_APPLICATION":
          return "potentially harmful application";
        default:
          return "security threat";
      }
    });
    return {
      isValid: false,
      message: `This URL contains ${prettyThreats.join(", ")} and cannot be shortened for safety reasons.`,
      threats: result.threats,
    };
  }

  return { isValid: true };
}
