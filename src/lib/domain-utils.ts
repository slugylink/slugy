import { db } from "@/server/db";

const VERCEL_API_URL = "https://api.vercel.com";

interface ApiResult {
  success: boolean;
  error?: string;
}

// Helper: Get Vercel credentials
function getVercelCredentials() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId || !teamId) {
    throw new Error("Vercel credentials not configured");
  }

  return { token, projectId, teamId };
}

/**
 * Add a custom domain to Vercel project
 */
export async function addDomainToVercel(domain: string): Promise<{
  success: boolean;
  error?: string;
  verificationRecord?: { type: string; name: string; value: string };
}> {
  try {
    const { token, projectId, teamId } = getVercelCredentials();

    const response = await fetch(
      `${VERCEL_API_URL}/v10/projects/${projectId}/domains?teamId=${teamId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || "Failed to add domain to Vercel",
      };
    }

    // Get verification record if domain needs verification
    const txtRecord = data.verification?.find(
      (v: { type: string; domain: string; value: string }) => v.type === "TXT",
    );

    return {
      success: true,
      verificationRecord: txtRecord
        ? {
            type: txtRecord.type,
            name: txtRecord.domain,
            value: txtRecord.value,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Error adding domain to Vercel:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to add domain to Vercel",
    };
  }
}

/**
 * Remove a domain from Vercel project
 */
export async function removeDomainFromVercel(
  domain: string,
): Promise<ApiResult> {
  try {
    const { token, projectId, teamId } = getVercelCredentials();

    const response = await fetch(
      `${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}?teamId=${teamId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        error: data.error?.message || "Failed to remove domain from Vercel",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error removing domain from Vercel:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove domain from Vercel",
    };
  }
}

/**
 * Verify domain on Vercel
 */
export async function verifyDomainOnVercel(domain: string): Promise<{
  success: boolean;
  verified: boolean;
  error?: string;
}> {
  try {
    const { token, projectId, teamId } = getVercelCredentials();

    const response = await fetch(
      `${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}/verify?teamId=${teamId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: data.error?.message || "Failed to verify domain on Vercel",
      };
    }

    return {
      success: true,
      verified: data.verified || false,
    };
  } catch (error) {
    console.error("Error verifying domain on Vercel:", error);
    return {
      success: false,
      verified: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to verify domain on Vercel",
    };
  }
}

/**
 * Check if domain DNS is properly configured by testing actual DNS resolution
 */
export async function checkDnsConfiguration(domain: string): Promise<{
  success: boolean;
  configured: boolean;
  error?: string;
}> {
  try {
    // Test if the domain resolves to Vercel's infrastructure
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Slugy-DNS-Check/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    // If we get a response (even 404), it means DNS is configured
    // We check for specific headers that indicate Vercel hosting
    const serverHeader = response.headers.get('server');
    const xVercelHeader = response.headers.get('x-vercel-id');
    
    const isConfigured = response.status !== 0 && (
      serverHeader?.includes('vercel') || 
      xVercelHeader !== null ||
      response.status < 500 // Any response under 500 means DNS is working
    );

    return {
      success: true,
      configured: isConfigured,
    };
  } catch (error) {
    // If we can't reach the domain, DNS is likely not configured
    return {
      success: true,
      configured: false,
      error: error instanceof Error ? error.message : 'DNS not configured'
    };
  }
}

/**
 * Validate domain format
 */
export function validateDomain(domain: string): {
  valid: boolean;
  error?: string;
} {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

  if (!domainRegex.test(cleanDomain)) {
    return { valid: false, error: "Invalid domain format" };
  }

  if (
    cleanDomain.includes("localhost") ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanDomain)
  ) {
    return { valid: false, error: "Cannot use localhost or IP addresses" };
  }

  return { valid: true };
}

/**
 * Check if domain is already in use
 */
export async function isDomainInUse(domain: string): Promise<boolean> {
  try {
    const existing = await db.customDomain.findUnique({
      where: { domain },
    });
    return !!existing;
  } catch (error) {
    console.error("Error checking domain usage:", error);
    return false;
  }
}


