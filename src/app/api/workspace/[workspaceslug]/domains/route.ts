import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthSession } from "@/lib/auth";
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

// Helper: Get authenticated session
async function getSession() {
  const authResult = await getAuthSession();
  if (!authResult.success) {
    throw new Error("Unauthorized");
  }
  return authResult.session;
}

// Helper: Get workspace with access check
async function getWorkspace(
  workspaceSlug: string,
  userId: string,
  requireAdminAccess = false,
) {
  const workspace = await db.workspace.findFirst({
    where: {
      slug: workspaceSlug,
      OR: [
        { userId },
        {
          members: {
            some: {
              userId,
              ...(requireAdminAccess && { role: { in: ["owner", "admin"] } }),
            },
          },
        },
      ],
    },
  });

  if (!workspace) {
    throw new Error(
      requireAdminAccess
        ? "Workspace not found or insufficient permissions"
        : "Workspace not found",
    );
  }

  return workspace;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await getSession();
    const { workspaceslug } = await params;

    const workspace = await db.workspace.findFirst({
      where: {
        slug: workspaceslug,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        customDomains: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ domains: workspace.customDomains });
  } catch (error) {
    console.error("Error fetching domains:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch domains";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await getSession();
    const { workspaceslug } = await params;
    const body = await req.json();

    // Validate domain format
    const domain = body.domain?.toLowerCase().trim();
    const validation = validateDomain(domain);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Verify workspace access (admin only)
    const workspace = await getWorkspace(workspaceslug, session.user.id, true);

    // Check if domain is already in use
    const inUse = await isDomainInUse(domain);
    if (inUse) {
      return NextResponse.json(
        { error: "Domain is already in use" },
        { status: 409 },
      );
    }

    // Add domain to Vercel (for SSL handling)
    const vercelResult = await addDomainToVercel(domain);
    if (!vercelResult.success) {
      return NextResponse.json(
        { error: vercelResult.error || "Failed to add domain to Vercel" },
        { status: 500 },
      );
    }

    // Add domain to Cloudflare for SaaS (for tracking)
    const cfResult = await addCustomHostnameToCloudflare(domain);
    if (!cfResult.success) {
      // Rollback: Remove from Vercel if Cloudflare fails
      await removeDomainFromVercel(domain);
      return NextResponse.json(
        { error: cfResult.error || "Failed to add domain to Cloudflare" },
        { status: 500 },
      );
    }

    // Create domain in database
    const customDomain = await db.customDomain.create({
      data: {
        domain,
        workspaceId: workspace.id,
        verificationToken: vercelResult.verificationRecord?.value || null,
        verified: false,
        dnsConfigured: false,
        cloudflareCustomHostnameId: cfResult.customHostnameId,
        cloudflareCnameTarget: cfResult.cnameTarget,
        cloudflareStatus: "pending",
        cloudflareSslStatus: cfResult.sslStatus,
      },
    });

    return NextResponse.json(
      {
        domain: customDomain,
        verificationRecord: vercelResult.verificationRecord,
        cnameTarget: "cname.vercel-dns.com",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error adding domain:", error);
    const message =
      error instanceof Error ? error.message : "Failed to add domain";
    const status =
      message.includes("Unauthorized") || message.includes("permissions")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await getSession();
    const { workspaceslug } = await params;
    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get("domainId");

    if (!domainId) {
      return NextResponse.json(
        { error: "Domain ID is required" },
        { status: 400 },
      );
    }

    // Verify workspace access (admin only)
    const workspace = await getWorkspace(workspaceslug, session.user.id, true);

    // Get and verify domain ownership
    const customDomain = await db.customDomain.findUnique({
      where: { id: domainId },
    });

    if (!customDomain || customDomain.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Remove from Vercel (continue on failure)
    const vercelResult = await removeDomainFromVercel(customDomain.domain);
    if (!vercelResult.success) {
      console.error("Failed to remove domain from Vercel:", vercelResult.error);
    }

    // Remove from Cloudflare (continue on failure)
    if (customDomain.cloudflareCustomHostnameId) {
      const cfResult = await removeCustomHostnameFromCloudflare(
        customDomain.cloudflareCustomHostnameId,
      );
      if (!cfResult.success) {
        console.error(
          "Failed to remove domain from Cloudflare:",
          cfResult.error,
        );
      }
    }

    // Delete from database
    await db.customDomain.delete({ where: { id: domainId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting domain:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete domain";
    const status =
      message.includes("Unauthorized") || message.includes("permissions")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await getSession();
    const { workspaceslug } = await params;

    // Parse JSON with error handling
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { domainId, action } = body;
    if (!domainId || !action) {
      return NextResponse.json(
        { error: "Domain ID and action are required" },
        { status: 400 },
      );
    }

    // Verify workspace access
    const workspace = await getWorkspace(workspaceslug, session.user.id);

    // Get and verify domain ownership
    const customDomain = await db.customDomain.findUnique({
      where: { id: domainId },
    });

    if (!customDomain || customDomain.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Handle verify action
    if (action === "verify") {
      // Verify domain on Vercel (primary SSL provider)
      const vercelVerifyResult = await verifyDomainOnVercel(
        customDomain.domain,
      );

      // Check Cloudflare status (for tracking)
      let cloudflareVerified = false;
      let cloudflareStatus = customDomain.cloudflareStatus;
      let cloudflareSslStatus = customDomain.cloudflareSslStatus;

      if (customDomain.cloudflareCustomHostnameId) {
        const cfResult = await verifyCustomHostnameOnCloudflare(
          customDomain.cloudflareCustomHostnameId,
        );

        if (cfResult.success) {
          cloudflareVerified = cfResult.verified;
          cloudflareStatus = cfResult.status ?? null;
          cloudflareSslStatus = cfResult.sslStatus ?? null;
        }
      }

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
        configured: isVerified,
        vercelVerified: vercelVerifyResult.verified,
        cloudflareVerified,
        error: !vercelVerifyResult.success
          ? vercelVerifyResult.error
          : undefined,
      });
    }

    // Handle toggle-redirect action
    if (action === "toggle-redirect") {
      const updatedDomain = await db.customDomain.update({
        where: { id: domainId },
        data: { redirectToWww: !customDomain.redirectToWww },
      });

      return NextResponse.json({ domain: updatedDomain });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating domain:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update domain";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
