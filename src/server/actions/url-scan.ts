"use server";

import { unstable_cache } from "next/cache";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Constants
// ============================================================================

const SAFE_BROWSING_API_BASE = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const CLIENT_VERSION = "1.0";
const CACHE_REVALIDATE_SECONDS = 3600;
const CACHE_TAG = "scan-url-safety";
const REQUEST_TIMEOUT_MS = 5000;
const ENV_CACHE_TTL = 300000;
const CONTENT_SNIFF_LIMIT = 200000;

const THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING", 
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
] as const;

const PLATFORM_TYPES = ["ANY_PLATFORM"] as const;
const THREAT_ENTRY_TYPES = ["URL"] as const;

const THREAT_TYPE_MESSAGES: Record<string, string> = {
  MALWARE: "malware",
  SOCIAL_ENGINEERING: "phishing",
  UNWANTED_SOFTWARE: "unwanted software",
  POTENTIALLY_HARMFUL_APPLICATION: "potentially harmful application",
};

const ERROR_MESSAGES = {
  URL_REQUIRED: "URL is required",
  API_KEY_MISSING: "Google Safe Browsing API key not configured",
  API_REQUEST_FAILED: "API request failed",
  UNKNOWN_ERROR: "Unknown error occurred",
  UNABLE_TO_VERIFY: "Unable to verify URL safety. Please try again.",
  TIMEOUT: "Request timeout - URL assumed safe",
} as const;

const SUSPICIOUS_PATTERNS = [
  /\b(porn|porno|xxx|sex|nude|nsfw)\b/i,
  /\b(hentai|jav|milf|camgirl|escort)\b/i,
  /\b(erotic|adult|webcam|livecam)\b/i,
  /\bonly\s*fans?\b/i,
  /\bchat\s*urbate\b/i,
];

const SAFE_BROWSING_ADULT_LABELS = new Set(["ADULT", "DANGEROUS_CONTENT", "DANGEROUS"]);

// ============================================================================
// Environment Validation (with caching)
// ============================================================================

let envCache: { apiKey: string; clientId: string } | null = null;
let envCacheTime = 0;

function validateEnvironment(): { apiKey: string; clientId: string } | null {
  const now = Date.now();
  
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
  
  envCache = { apiKey, clientId };
  envCacheTime = now;
  
  return envCache;
}

// ============================================================================
// URL Utilities
// ============================================================================

function normalizeUrl(url: string): string {
  if (!url) return url;
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return trimmedUrl;
  
  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }
  
  if (trimmedUrl.startsWith("www.") || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }
  
  return trimmedUrl;
}

function isLikelyAdultUrl(inputUrl: string): boolean {
  try {
    const u = new URL(inputUrl);
    const combined = `${u.hostname} ${u.pathname} ${u.search} ${u.hash}`.toLowerCase();
    
    return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(combined));
  } catch {
    return false;
  }
}

async function sniffPageForAdultContent(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Slugy-URL-Scanner/2.0-Fast" },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return false;

    const text = await res.text().catch(() => "");
    const snippet = text.slice(0, CONTENT_SNIFF_LIMIT).toLowerCase();

    return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(snippet));
  } catch {
    return false;
  }
}

// ============================================================================
// Safe Browsing API
// ============================================================================

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

function formatThreatTypes(threats: string[]): string[] {
  return threats.map(threat => THREAT_TYPE_MESSAGES[threat] || "security threat");
}

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

    const threats = data.matches.map(m => m.threatType);
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
      isSafe: true,
      threats: [],
      error: errorMessage,
    };
  }
}

// ============================================================================
// Cached Scanning
// ============================================================================

const cachedScanUrlSafety = unstable_cache(
  async (url: string) => fetchUrlSafety(url),
  [CACHE_TAG],
  { 
    revalidate: CACHE_REVALIDATE_SECONDS,
    tags: [CACHE_TAG],
  },
);

export async function scanUrlSafety(url: string): Promise<UrlScanResult> {
  try {
    return await cachedScanUrlSafety(url);
  } catch (error) {
    console.error("Cache error in scanUrlSafety:", error);
    return fetchUrlSafety(url);
  }
}

// ============================================================================
// URL Validation
// ============================================================================

export async function validateUrlSafety(url: string): Promise<ValidationResult> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const env = validateEnvironment();

    // Step 1: Check Safe Browsing API if configured
    if (env) {
      const sbResult = await scanUrlSafety(normalizedUrl);

      // Block if Safe Browsing reports adult/dangerous content
      if (sbResult.threats?.some(t => SAFE_BROWSING_ADULT_LABELS.has(t))) {
        return {
          isValid: false,
          message: "This URL is classified as unsafe by Google Safe Browsing and cannot be shortened.",
          threats: sbResult.threats,
        };
      }

      // Block if Safe Browsing reports other threats
      if (!sbResult.isSafe) {
        const prettyThreats = formatThreatTypes(sbResult.threats);
        return {
          isValid: false,
          message: `This URL contains ${prettyThreats.join(", ")} and cannot be shortened for safety reasons.`,
          threats: sbResult.threats,
        };
      }
    }

    // Step 2: Quick heuristic check for adult content
    if (normalizedUrl && isLikelyAdultUrl(normalizedUrl)) {
      return {
        isValid: false,
        message: "This URL appears to contain adult content and cannot be shortened for safety reasons.",
        threats: [],
      };
    }

    // Step 3: Optional content sniffing
    const sniffDetected = await sniffPageForAdultContent(normalizedUrl).catch(() => false);
    if (sniffDetected) {
      return {
        isValid: false,
        message: "This URL appears to contain adult content (detected in page content) and cannot be shortened.",
        threats: [],
      };
    }

    // Step 4: Final scan if Safe Browsing wasn't configured earlier
    if (!env) {
      const result = await scanUrlSafety(normalizedUrl);

      if (result.error === ERROR_MESSAGES.API_KEY_MISSING || 
          result.error === ERROR_MESSAGES.TIMEOUT) {
        return { isValid: true };
      }

      if (result.error) {
        console.warn("URL safety check failed, defaulting to safe:", result.error);
        return { isValid: true };
      }

      if (!result.isSafe) {
        const prettyThreats = formatThreatTypes(result.threats);
        return {
          isValid: false,
          message: `This URL contains ${prettyThreats.join(", ")} and cannot be shortened for safety reasons.`,
          threats: result.threats,
        };
      }
    }

    return { isValid: true };
    
  } catch (error) {
    console.error("Unexpected error in validateUrlSafety:", error);
    return { 
      isValid: true,
      message: "URL safety check temporarily unavailable",
    };
  }
}

// ============================================================================
// Utilities
// ============================================================================

export async function isUrlScanningAvailable(): Promise<boolean> {
  return !!(process.env.GOOGLE_SAFE_BROWSING_API_KEY && 
           process.env.GOOGLE_SAFE_BROWSING_CLIENT_ID);
}