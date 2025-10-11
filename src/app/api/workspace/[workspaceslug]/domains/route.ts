import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import {
  validateDomain,
  isDomainInUse,
  addCustomHostnameToCloudflare,
  verifyCustomHostnameOnCloudflare,
  removeCustomHostnameFromCloudflare,
  addDomainToVercel,
  removeDomainFromVercel,
  verifyDomainOnVercel,
} from "@/lib/domain-utils";

/**
 * GET /api/workspace/[workspaceslug]/domains
 * Get all custom domains for a workspace
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const workspaceSlug = resolvedParams.workspaceslug;

    // Get workspace and verify access
    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        OR: [
          { userId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        customDomains: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      domains: workspace.customDomains,
    });
  } catch (error) {
    console.error("Error fetching domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace/[workspaceslug]/domains
 * Add a new custom domain to workspace
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const workspaceSlug = resolvedParams.workspaceslug;
    const body = await req.json();
    let { domain } = body;

    // Validate domain format
    domain = domain.toLowerCase().trim();
    const validation = validateDomain(domain);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Get workspace and verify access (owner or admin only)
    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        OR: [
          { userId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
                role: { in: ["owner", "admin"] },
              },
            },
          },
        ],
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or insufficient permissions" },
        { status: 404 }
      );
    }

    // Note: Domain limit checking is disabled for now
    // You can uncomment and implement this based on your subscription plans
    // const subscription = await db.subscription.findUnique({
    //   where: { referenceId: session.user.id },
    //   include: { plan: true },
    // });
    // const maxDomains = subscription?.plan?.maxCustomDomains ?? 0;
    // const limitCheck = await checkDomainLimit(workspace.id, maxDomains);
    // if (!limitCheck.canAdd) {
    //   return NextResponse.json(
    //     { error: limitCheck.error || "Domain limit reached" },
    //     { status: 403 }
    //   );
    // }

    // Check if domain is already in use
    const inUse = await isDomainInUse(domain);
    if (inUse) {
      return NextResponse.json(
        { error: "Domain is already in use" },
        { status: 409 }
      );
    }

    // Add domain to Vercel (for SSL handling)
    const vercelResult = await addDomainToVercel(domain);
    
    if (!vercelResult.success) {
      return NextResponse.json(
        { error: vercelResult.error || "Failed to add domain to Vercel" },
        { status: 500 }
      );
    }

    // Add domain to Cloudflare for SaaS (for tracking)
    const cfResult = await addCustomHostnameToCloudflare(domain);
    
    if (!cfResult.success) {
      // Rollback: Remove from Vercel if Cloudflare fails
      await removeDomainFromVercel(domain);
      return NextResponse.json(
        { error: cfResult.error || "Failed to add domain to Cloudflare" },
        { status: 500 }
      );
    }

    // Create domain in database with both Vercel and Cloudflare metadata
    const customDomain = await db.customDomain.create({
      data: {
        domain,
        workspaceId: workspace.id,
        verificationToken: vercelResult.verificationRecord?.value || null,
        verified: false,
        dnsConfigured: false,
        // Cloudflare for SaaS fields
        cloudflareCustomHostnameId: cfResult.customHostnameId,
        cloudflareCnameTarget: cfResult.cnameTarget,
        cloudflareStatus: "pending",
        cloudflareSslStatus: cfResult.sslStatus,
      },
    });

    return NextResponse.json({
      domain: customDomain,
      verificationRecord: vercelResult.verificationRecord, // TXT record for Vercel verification
      cnameTarget: "cname.vercel-dns.com", // User needs to point domain to Vercel
    }, { status: 201 });
  } catch (error) {
    console.error("Error adding domain:", error);
    return NextResponse.json(
      { error: "Failed to add domain" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspace/[workspaceslug]/domains
 * Remove a custom domain from workspace
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const workspaceSlug = resolvedParams.workspaceslug;
    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get("domainId");

    if (!domainId) {
      return NextResponse.json(
        { error: "Domain ID is required" },
        { status: 400 }
      );
    }

    // Get workspace and verify access
    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        OR: [
          { userId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
                role: { in: ["owner", "admin"] },
              },
            },
          },
        ],
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or insufficient permissions" },
        { status: 404 }
      );
    }

    // Get domain
    const customDomain = await db.customDomain.findUnique({
      where: { id: domainId },
    });

    if (!customDomain || customDomain.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    // Remove domain from Vercel
    const vercelResult = await removeDomainFromVercel(customDomain.domain);
    if (!vercelResult.success) {
      console.error("Failed to remove domain from Vercel:", vercelResult.error);
      // Continue even if Vercel fails
    }

    // Remove domain from Cloudflare for SaaS
    if (customDomain.cloudflareCustomHostnameId) {
      const cfResult = await removeCustomHostnameFromCloudflare(
        customDomain.cloudflareCustomHostnameId
      );
      if (!cfResult.success) {
        console.error("Failed to remove domain from Cloudflare:", cfResult.error);
        // Continue with database deletion even if Cloudflare fails
      }
    }

    // Delete domain from database
    await db.customDomain.delete({
      where: { id: domainId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting domain:", error);
    return NextResponse.json(
      { error: "Failed to delete domain" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workspace/[workspaceslug]/domains
 * Verify or update a custom domain
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const workspaceSlug = resolvedParams.workspaceslug;
    
    // Parse JSON with error handling
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { domainId, action } = body;

    if (!domainId || !action) {
      return NextResponse.json(
        { error: "Domain ID and action are required" },
        { status: 400 }
      );
    }

    // Get workspace and verify access
    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        OR: [
          { userId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Get domain
    const customDomain = await db.customDomain.findUnique({
      where: { id: domainId },
    });

    if (!customDomain || customDomain.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    if (action === "verify") {
      // Verify domain on Vercel (primary SSL provider)
      const vercelVerifyResult = await verifyDomainOnVercel(customDomain.domain);
      
      // Also check Cloudflare status (for tracking)
      let cloudflareVerified = false;
      let cloudflareStatus = customDomain.cloudflareStatus;
      let cloudflareSslStatus = customDomain.cloudflareSslStatus;

      if (customDomain.cloudflareCustomHostnameId) {
        const cfResult = await verifyCustomHostnameOnCloudflare(
          customDomain.cloudflareCustomHostnameId
        );
        
        if (cfResult.success) {
          cloudflareVerified = cfResult.verified;
          cloudflareStatus = cfResult.status ?? null;
          cloudflareSslStatus = cfResult.sslStatus ?? null;
        }
      }

      // Domain is verified if Vercel says it's verified
      const isVerified = vercelVerifyResult.verified;

      // Update domain in database
      const updatedDomain = await db.customDomain.update({
        where: { id: domainId },
        data: {
          verified: isVerified,
          dnsConfigured: isVerified,
          sslEnabled: isVerified,
          cloudflareStatus,
          cloudflareSslStatus,
          lastChecked: new Date(),
        },
      });

      return NextResponse.json({
        domain: updatedDomain,
        verified: isVerified,
        vercelVerified: vercelVerifyResult.verified,
        cloudflareVerified,
        error: !vercelVerifyResult.success ? vercelVerifyResult.error : undefined,
      });
    }

    if (action === "toggle-redirect") {
      const updatedDomain = await db.customDomain.update({
        where: { id: domainId },
        data: {
          redirectToWww: !customDomain.redirectToWww,
        },
      });

      return NextResponse.json({ domain: updatedDomain });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating domain:", error);
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    );
  }
}

