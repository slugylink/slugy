"use server";

import { unstable_cache } from "next/cache";

// Types
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

interface ValidationResult {
  isValid: boolean;
  message?: string;
  threats?: string[];
}

// Constants - Optimized for speed
const SAFE_BROWSING_API_BASE = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const CLIENT_VERSION = "1.0";
const CACHE_REVALIDATE_SECONDS = 3600; // 1 hour - much longer cache for speed
const CACHE_TAG = "scan-url-safety";
const BATCH_SIZE = 50; // Process more URLs at once for speed
const REQUEST_TIMEOUT_MS = 5000; // 5 second timeout for faster failure
const RATE_LIMIT_DELAY_MS = 50; // Reduced delay between batches

// Threat types for comprehensive scanning
const THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING", 
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
] as const;

const PLATFORM_TYPES = ["ANY_PLATFORM"] as const;
const THREAT_ENTRY_TYPES = ["URL"] as const;

// Threat type mapping for user-friendly messages
const THREAT_TYPE_MESSAGES: Record<string, string> = {
  MALWARE: "malware",
  SOCIAL_ENGINEERING: "phishing",
  UNWANTED_SOFTWARE: "unwanted software",
  POTENTIALLY_HARMFUL_APPLICATION: "potentially harmful application",
} as const;

// Error messages
const ERROR_MESSAGES = {
  URL_REQUIRED: "URL is required",
  API_KEY_MISSING: "Google Safe Browsing API key not configured",
  API_REQUEST_FAILED: "API request failed",
  UNKNOWN_ERROR: "Unknown error occurred",
  UNABLE_TO_VERIFY: "Unable to verify URL safety. Please try again.",
  TIMEOUT: "Request timeout - URL assumed safe",
} as const;

// Fast URL normalization utility
function normalizeUrl(url: string): string {
  if (!url) return url;
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return trimmedUrl;
  
  // Fast path for already normalized URLs
  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }
  
  // Fast path for common patterns
  if (trimmedUrl.startsWith("www.") || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }
  
  return trimmedUrl;
}

// Validate environment variables - cached for speed
let envCache: { apiKey: string; clientId: string } | null = null;
let envCacheTime = 0;
const ENV_CACHE_TTL = 300000; // 5 minutes

function validateEnvironment(): { apiKey: string; clientId: string } | null {
  const now = Date.now();
  
  // Return cached environment if still valid
  if (envCache && (now - envCacheTime) < ENV_CACHE_TTL) {
    return envCache;
  }
  
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  const clientId = process.env.GOOGLE_SAFE_BROWSING_CLIENT_ID;
  
  if (!apiKey || !clientId) {
    console.warn("Google Safe Browsing API configuration missing:", {
      hasApiKey: !!apiKey,
      hasClientId: !!clientId,
    });
    return null;
  }
  
  // Cache the environment
  envCache = { apiKey, clientId };
  envCacheTime = now;
  
  return envCache;
}

// Build Safe Browsing request payload - optimized for batch processing
function buildSafeBrowsingRequest(urls: string[], clientId: string): SafeBrowsingRequest {
  return {
    client: {
      clientId,
      clientVersion: CLIENT_VERSION,
    },
    threatInfo: {
      threatTypes: [...THREAT_TYPES],
      platformTypes: [...PLATFORM_TYPES],
      threatEntryTypes: [...THREAT_ENTRY_TYPES],
      threatEntries: urls.map(url => ({ url })),
    },
  };
}

// Format threat types for user display
function formatThreatTypes(threats: string[]): string[] {
  return threats.map((threat) => 
    THREAT_TYPE_MESSAGES[threat] || "security threat"
  );
}

// Fast URL safety check with aggressive caching
async function fetchUrlSafety(url: string): Promise<UrlScanResult> {
  if (!url) {
    return { 
      isSafe: false, 
      threats: [], 
      error: ERROR_MESSAGES.URL_REQUIRED 
    };
  }

  const env = validateEnvironment();
  if (!env) {
    console.warn("Google Safe Browsing API key not configured");
    return { 
      isSafe: true, 
      threats: [], 
      error: ERROR_MESSAGES.API_KEY_MISSING 
    };
  }

  const { apiKey, clientId } = env;
  const normalizedUrl = normalizeUrl(url);

  const requestBody = buildSafeBrowsingRequest([normalizedUrl], clientId);

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(
      `${SAFE_BROWSING_API_BASE}?key=${apiKey}`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "Slugy-URL-Scanner/2.0-Fast",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
        next: { revalidate: 0 },
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `${ERROR_MESSAGES.API_REQUEST_FAILED}: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data: SafeBrowsingResponse = await response.json();

    if (!data.matches?.length) {
      return { isSafe: true, threats: [] };
    }

    const threats = data.matches.map((m) => m.threatType);
    return { isSafe: false, threats };
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn("URL safety check timeout, assuming safe:", url);
      return { 
        isSafe: true, 
        threats: [], 
        error: ERROR_MESSAGES.TIMEOUT 
      };
    }
    
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
    console.error("Error scanning URL:", error);
    
    return {
      isSafe: true, // Default to "safe" if scan unavailable, but flag error
      threats: [],
      error: errorMessage,
    };
  }
}

// Ultra-fast caching wrapper with longer TTL for speed
const cachedScanUrlSafety = unstable_cache(
  async (url: string) => fetchUrlSafety(url),
  [CACHE_TAG],
  { 
    revalidate: CACHE_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);

// Main scan function - optimized for speed
export async function scanUrlSafety(url: string): Promise<UrlScanResult> {
  try {
    // Try cache first for maximum speed
    return await cachedScanUrlSafety(url);
  } catch (error) {
    console.error("Cache error in scanUrlSafety:", error);
    // Fast fallback to direct call
    return fetchUrlSafety(url);
  }
}

// Fast validation wrapper with aggressive caching
export async function validateUrlSafety(url: string): Promise<ValidationResult> {
  try {
    const result = await scanUrlSafety(url);

    // Handle configuration errors gracefully - return safe immediately
    if (result.error === ERROR_MESSAGES.API_KEY_MISSING) {
      console.warn("Safe Browsing API not configured, defaulting to safe");
      return { isValid: true };
    }

    // Handle timeouts - return safe immediately
    if (result.error === ERROR_MESSAGES.TIMEOUT) {
      return { isValid: true };
    }

    // Handle other errors - return safe for speed
    if (result.error && result.error !== ERROR_MESSAGES.API_KEY_MISSING) {
      console.warn("URL safety check failed, defaulting to safe for speed:", result.error);
      return { isValid: true };
    }

    // Handle unsafe URLs
    if (!result.isSafe) {
      const prettyThreats = formatThreatTypes(result.threats);
      return {
        isValid: false,
        message: `This URL contains ${prettyThreats.join(", ")} and cannot be shortened for safety reasons.`,
        threats: result.threats,
      };
    }

    // Safe URL
    return { isValid: true };
    
  } catch (error) {
    console.error("Unexpected error in validateUrlSafety:", error);
    
    // Return safe by default for speed
    return { 
      isValid: true,
      message: "URL safety check temporarily unavailable",
    };
  }
}

// Utility function to check if URL scanning is available
export async function isUrlScanningAvailable(): Promise<boolean> {
  return !!(process.env.GOOGLE_SAFE_BROWSING_API_KEY && 
           process.env.GOOGLE_SAFE_BROWSING_CLIENT_ID);
}

// Ultra-fast batch URL validation for multiple URLs
export async function validateMultipleUrls(urls: string[]): Promise<Map<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>();
  
  if (!urls.length) return results;
  
  // Process URLs in larger batches for speed
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel for maximum speed
    const batchPromises = batch.map(async (url) => {
      try {
        const result = await validateUrlSafety(url);
        return { url, result };
      } catch (error) {
        console.error("Failed to validate URL in batch:", url, error);
        // Return safe by default for speed
        return { url, result: { isValid: true } as ValidationResult };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((promiseResult, index) => {
      if (promiseResult.status === "fulfilled") {
        const { url, result } = promiseResult.value;
        results.set(url, result);
      } else {
        const failedUrl = batch[index];
        console.error("Failed to validate URL in batch:", failedUrl, promiseResult.reason);
        // Set safe by default for speed
        results.set(failedUrl, { isValid: true });
      }
    });
    
    // Minimal delay between batches for speed
    if (i + BATCH_SIZE < urls.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }
  
  return results;
}

// New: Ultra-fast single URL validation with minimal overhead
export async function validateUrlSafetyFast(url: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    // Skip normalization for speed if URL looks valid
    if (!url.includes("://") && !url.includes(".")) {
      return false; // Invalid URL format
    }
    
    // Use cached result if available
    const result = await scanUrlSafety(url);
    return result.isSafe;
    
  } catch (error) {
    console.error("Fast URL validation failed:", error);
    return true; // Assume safe for speed
  }
}

// New: Bulk fast validation for maximum speed
export async function validateMultipleUrlsFast(urls: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  if (!urls.length) return results;
  
  // Process all URLs in parallel for maximum speed
  const promises = urls.map(async (url) => {
    try {
      const isValid = await validateUrlSafetyFast(url);
      return { url, isValid };
    } catch (error) {
      console.error("Fast URL validation failed:", url, error);
      return { url, isValid: true }; // Assume safe for speed
    }
  });
  
  const results_array = await Promise.allSettled(promises);
  
  results_array.forEach((result) => {
    if (result.status === "fulfilled") {
      results.set(result.value.url, result.value.isValid);
    }
  });
  
  return results;
}
