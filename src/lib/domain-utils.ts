import { db } from "@/server/db";

const VERCEL_API_URL = "https://api.vercel.com";
const CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4";

interface CloudflareCustomHostnameResponse {
  result?: {
    id: string;
    hostname: string;
    ssl: {
      status: string;
      validation_records?: Array<{
        txt_name: string;
        txt_value: string;
      }>;
      cname_target?: string;
    };
    status: string;
    verification_errors?: string[];
  };
  success: boolean;
  errors?: Array<{ message: string }>;
}

/**
 * Add a custom hostname to Cloudflare for SaaS
 * See: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/create-custom-hostnames/
 */
export async function addCustomHostnameToCloudflare(hostname: string): Promise<{
  success: boolean;
  error?: string;
  customHostnameId?: string;
  cnameTarget?: string;
  sslStatus?: string;
}> {
  try {
    console.log(
      "🔧 Cloudflare API Token exists:",
      !!process.env.CLOUDFLARE_API_TOKEN,
    );
    console.log(
      "🔧 Cloudflare Zone ID exists:",
      !!process.env.CLOUDFLARE_ZONE_ID,
    );

    if (!process.env.CLOUDFLARE_API_TOKEN) {
      throw new Error("CLOUDFLARE_API_TOKEN is not configured");
    }
    if (!process.env.CLOUDFLARE_ZONE_ID) {
      throw new Error("CLOUDFLARE_ZONE_ID is not configured");
    }

    const response = await fetch(
      `${CLOUDFLARE_API_URL}/zones/${process.env.CLOUDFLARE_ZONE_ID}/custom_hostnames`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostname,
          ssl: {
            method: "http",
            type: "dv",
            settings: {
              http2: "on",
              min_tls_version: "1.2",
              tls_1_3: "on",
              early_hints: "on",
            },
          },
        }),
      },
    );

    const data: CloudflareCustomHostnameResponse = await response.json();

    console.log("🌐 Cloudflare API Response:", {
      ok: response.ok,
      status: response.status,
      success: data.success,
      hasResult: !!data.result,
      cnameTarget: data.result?.ssl?.cname_target,
      errors: data.errors,
    });

    if (!response.ok || !data.success) {
      const errorMessage =
        data.errors?.[0]?.message || "Failed to add custom hostname";
      console.error("❌ Cloudflare API Error:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    if (!data.result) {
      console.error("❌ No result from Cloudflare");
      return {
        success: false,
        error: "No result returned from Cloudflare",
      };
    }

    // Cloudflare returns cname_target in the ssl object, but it might be undefined initially
    // The CNAME format is: {hostname}.cdn.cloudflare.net
    const cnameTarget =
      data.result.ssl.cname_target || `${hostname}.cdn.cloudflare.net`;

    console.log("✅ Cloudflare hostname added:", {
      id: data.result.id,
      cnameTarget,
      status: data.result.status,
      sslStatus: data.result.ssl.status,
    });

    return {
      success: true,
      customHostnameId: data.result.id,
      cnameTarget,
      sslStatus: data.result.ssl.status,
    };
  } catch (error) {
    console.error("Error adding custom hostname to Cloudflare:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to add custom hostname",
    };
  }
}

/**
 * Verify custom hostname status on Cloudflare for SaaS
 */
export async function verifyCustomHostnameOnCloudflare(
  customHostnameId: string,
): Promise<{
  success: boolean;
  verified: boolean;
  sslStatus?: string;
  status?: string;
  error?: string;
}> {
  try {
    if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ZONE_ID) {
      throw new Error("Cloudflare credentials not configured");
    }

    const response = await fetch(
      `${CLOUDFLARE_API_URL}/zones/${process.env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${customHostnameId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data: CloudflareCustomHostnameResponse = await response.json();

    if (!response.ok || !data.success || !data.result) {
      return {
        success: false,
        verified: false,
        error: data.errors?.[0]?.message || "Failed to verify hostname",
      };
    }

    const isVerified =
      data.result.status === "active" && data.result.ssl.status === "active";

    return {
      success: true,
      verified: isVerified,
      sslStatus: data.result.ssl.status,
      status: data.result.status,
    };
  } catch (error) {
    console.error("Error verifying custom hostname:", error);
    return {
      success: false,
      verified: false,
      error:
        error instanceof Error ? error.message : "Failed to verify hostname",
    };
  }
}

/**
 * Remove custom hostname from Cloudflare for SaaS
 */
export async function removeCustomHostnameFromCloudflare(
  customHostnameId: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ZONE_ID) {
      throw new Error("Cloudflare credentials not configured");
    }

    const response = await fetch(
      `${CLOUDFLARE_API_URL}/zones/${process.env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${customHostnameId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        error: data.errors?.[0]?.message || "Failed to remove custom hostname",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error removing custom hostname:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove hostname",
    };
  }
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
    const response = await fetch(
      `${VERCEL_API_URL}/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains?teamId=${process.env.VERCEL_TEAM_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
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
    if (data.verification && data.verification.length > 0) {
      const txtRecord = data.verification.find(
        (v: { type: string; domain: string; value: string }) =>
          v.type === "TXT",
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
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding domain to Vercel:", error);
    return {
      success: false,
      error: "Failed to add domain to Vercel",
    };
  }
}

/**
 * Remove a domain from Vercel project
 */
export async function removeDomainFromVercel(domain: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(
      `${VERCEL_API_URL}/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}?teamId=${process.env.VERCEL_TEAM_ID}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
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
      error: "Failed to remove domain from Vercel",
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
    const response = await fetch(
      `${VERCEL_API_URL}/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}/verify?teamId=${process.env.VERCEL_TEAM_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
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
      error: "Failed to verify domain on Vercel",
    };
  }
}

/**
 * Verify domain configuration via DNS (Cloudflare-compatible)
 */
export async function verifyDomainViaDNS(domain: string): Promise<{
  verified: boolean;
  configured: boolean;
  verificationRecord?: { type: string; name: string; value: string };
  error?: string;
}> {
  try {
    // Check CNAME record using DNS-over-HTTPS (Cloudflare)
    const dnsApiUrl = `https://cloudflare-dns.com/dns-query?name=${domain}&type=CNAME`;

    const response = await fetch(dnsApiUrl, {
      headers: {
        Accept: "application/dns-json",
      },
    });

    if (!response.ok) {
      return {
        verified: false,
        configured: false,
        error: "Failed to check DNS records",
      };
    }

    const data = (await response.json()) as {
      Answer?: Array<{ type: number; data: string }>;
    };

    // Check if CNAME points to cname.slugy.co
    const hasCNAME = data.Answer?.some(
      (record) =>
        record.type === 5 && // CNAME type
        record.data?.includes("cname.slugy.co"),
    );

    if (hasCNAME) {
      return {
        verified: true,
        configured: true,
      };
    }

    return {
      verified: false,
      configured: false,
      error: "CNAME record not found or not pointing to cname.slugy.co",
    };
  } catch (error) {
    console.error("Error verifying domain via DNS:", error);
    return {
      verified: false,
      configured: false,
      error: "Failed to verify domain via DNS",
    };
  }
}

/**
 * Get domain configuration instructions
 */
export function getDomainConfigInstructions(domain: string): {
  aRecord: { type: string; name: string; value: string };
  cnameRecord?: { type: string; name: string; value: string };
} {
  const isApex = !domain.includes("www") && domain.split(".").length === 2;

  if (isApex) {
    return {
      aRecord: {
        type: "A",
        name: "@",
        value: "76.76.21.21", // Vercel's IP
      },
      cnameRecord: {
        type: "CNAME",
        name: "www",
        value: "cname.slugy.co",
      },
    };
  }

  return {
    aRecord: {
      type: "CNAME",
      name: domain.split(".")[0] || "@",
      value: "cname.slugy.co",
    },
  };
}

/**
 * Validate domain format
 */
export function validateDomain(domain: string): {
  valid: boolean;
  error?: string;
} {
  domain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const domainRegex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

  if (!domainRegex.test(domain)) {
    return {
      valid: false,
      error: "Invalid domain format",
    };
  }

  if (domain.includes("localhost") || /^(\d{1,3}\.){3}\d{1,3}$/.test(domain)) {
    return {
      valid: false,
      error: "Cannot use localhost or IP addresses",
    };
  }

  return { valid: true };
}

/**
 * Check if user has reached domain limit
 */
export async function checkDomainLimit(
  workspaceId: string,
  maxDomains: number,
): Promise<{
  canAdd: boolean;
  currentCount: number;
  error?: string;
}> {
  try {
    const currentCount = await db.customDomain.count({
      where: { workspaceId },
    });

    return {
      canAdd: currentCount < maxDomains,
      currentCount,
      error:
        currentCount >= maxDomains
          ? `You've reached the maximum limit of ${maxDomains} custom domains`
          : undefined,
    };
  } catch (error) {
    console.error("Error checking domain limit:", error);
    return {
      canAdd: false,
      currentCount: 0,
      error: "Failed to check domain limit",
    };
  }
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
