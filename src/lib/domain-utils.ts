import { db } from "@/server/db";

const VERCEL_API_URL = "https://api.vercel.com";
// const CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4";

// Types
// interface CloudflareCustomHostnameResponse {
//   result?: {
//     id: string;
//     hostname: string;
//     ssl: {
//       status: string;
//       cname_target?: string;
//     };
//     status: string;
//   };
//   success: boolean;
//   errors?: Array<{ message: string }>;
// }

interface ApiResult {
  success: boolean;
  error?: string;
}

// Helper: Get Cloudflare credentials - DISABLED
// function getCloudflareCredentials() {
//   const apiToken = process.env.CLOUDFLARE_API_TOKEN;
//   const zoneId = process.env.CLOUDFLARE_ZONE_ID;

//   if (!apiToken || !zoneId) {
//     throw new Error("Cloudflare credentials not configured");
//   }

//   return { apiToken, zoneId };
// }

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
 * Add a custom hostname to Cloudflare for SaaS - DISABLED
 */
// export async function addCustomHostnameToCloudflare(hostname: string): Promise<{
//   success: boolean;
//   error?: string;
//   customHostnameId?: string;
//   cnameTarget?: string;
//   sslStatus?: string;
// }> {
//   try {
//     const { apiToken, zoneId } = getCloudflareCredentials();

//     const response = await fetch(
//       `${CLOUDFLARE_API_URL}/zones/${zoneId}/custom_hostnames`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${apiToken}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           hostname,
//           ssl: {
//             method: "http",
//             type: "dv",
//             settings: {
//               http2: "on",
//               min_tls_version: "1.2",
//               tls_1_3: "on",
//             },
//           },
//         }),
//       }
//     );

//     const data: CloudflareCustomHostnameResponse = await response.json();

//     if (!response.ok || !data.success || !data.result) {
//       const errorMessage = data.errors?.[0]?.message || "Failed to add custom hostname";
//       return { success: false, error: errorMessage };
//     }

//     const cnameTarget = data.result.ssl.cname_target || `${hostname}.cdn.cloudflare.net`;

//     return {
//       success: true,
//       customHostnameId: data.result.id,
//       cnameTarget,
//       sslStatus: data.result.ssl.status,
//     };
//   } catch (error) {
//     console.error("Error adding custom hostname to Cloudflare:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Failed to add custom hostname",
//     };
//   }
// }

/**
 * Verify custom hostname status on Cloudflare - DISABLED
 */
// export async function verifyCustomHostnameOnCloudflare(
//   customHostnameId: string
// ): Promise<{
//   success: boolean;
//   verified: boolean;
//   sslStatus?: string;
//   status?: string;
//   error?: string;
// }> {
//   try {
//     const { apiToken, zoneId } = getCloudflareCredentials();

//     const response = await fetch(
//       `${CLOUDFLARE_API_URL}/zones/${zoneId}/custom_hostnames/${customHostnameId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${apiToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const data: CloudflareCustomHostnameResponse = await response.json();

//     if (!response.ok || !data.success || !data.result) {
//       return {
//         success: false,
//         verified: false,
//         error: data.errors?.[0]?.message || "Failed to verify hostname",
//       };
//     }

//     const isVerified = data.result.status === "active" && data.result.ssl.status === "active";

//     return {
//       success: true,
//       verified: isVerified,
//       sslStatus: data.result.ssl.status,
//       status: data.result.status,
//     };
//   } catch (error) {
//     console.error("Error verifying custom hostname:", error);
//     return {
//       success: false,
//       verified: false,
//       error: error instanceof Error ? error.message : "Failed to verify hostname",
//     };
//   }
// }

/**
 * Remove custom hostname from Cloudflare - DISABLED
 */
// export async function removeCustomHostnameFromCloudflare(
//   customHostnameId: string
// ): Promise<ApiResult> {
//   try {
//     const { apiToken, zoneId } = getCloudflareCredentials();

//     const response = await fetch(
//       `${CLOUDFLARE_API_URL}/zones/${zoneId}/custom_hostnames/${customHostnameId}`,
//       {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${apiToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     if (!response.ok) {
//       const data = await response.json();
//       return {
//         success: false,
//         error: data.errors?.[0]?.message || "Failed to remove custom hostname",
//       };
//     }

//     return { success: true };
//   } catch (error) {
//     console.error("Error removing custom hostname:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Failed to remove hostname",
//     };
//   }
// }

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
      }
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
      (v: { type: string; domain: string; value: string }) => v.type === "TXT"
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
      error: error instanceof Error ? error.message : "Failed to add domain to Vercel",
    };
  }
}

/**
 * Remove a domain from Vercel project
 */
export async function removeDomainFromVercel(domain: string): Promise<ApiResult> {
  try {
    const { token, projectId, teamId } = getVercelCredentials();

    const response = await fetch(
      `${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}?teamId=${teamId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
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
      error: error instanceof Error ? error.message : "Failed to remove domain from Vercel",
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
      }
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
      error: error instanceof Error ? error.message : "Failed to verify domain on Vercel",
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

  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

  if (!domainRegex.test(cleanDomain)) {
    return { valid: false, error: "Invalid domain format" };
  }

  if (cleanDomain.includes("localhost") || /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanDomain)) {
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
