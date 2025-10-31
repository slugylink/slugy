import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthSession } from "@/lib/auth";
import {
  validateDomain,
  isDomainInUse,
  addDomainToVercel,
  removeDomainFromVercel,
  verifyDomainOnVercel,
  checkDnsConfiguration,
} from "@/lib/domain-utils";
import { deleteLink } from "@/lib/tinybird/slugy-links-metadata";
import { waitUntil } from "@vercel/functions";
import { checkDomainLimit } from "@/server/actions/limit";
import { jsonWithETag } from "@/lib/http";

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
      return jsonWithETag(req, { error: "Workspace not found" }, { status: 404 });
    }

    return jsonWithETag(req, { domains: workspace.customDomains });
  } catch (error) {
    console.error("Error fetching domains:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch domains";
    const status = message === "Unauthorized" ? 401 : 500;
    return jsonWithETag(req, { error: message }, { status });
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
      return jsonWithETag(req, { error: validation.error }, { status: 400 });
    }

    // Verify workspace access (admin only)
    const workspace = await getWorkspace(workspaceslug, session.user.id, true);

     // You can uncomment and implement this based on your subscription plans
    const subscription = await db.subscription.findUnique({
      where: { referenceId: session.user.id },
      include: { plan: true },
    });
    const maxDomains = subscription?.plan?.maxCustomDomains ?? 0;
    const limitCheck = await checkDomainLimit(workspace.id, maxDomains);
    if (!limitCheck.canAdd) {
      return jsonWithETag(req, { error: limitCheck.error || "Domain limit reached" }, { status: 403 });
    }

    // Check if domain is already in use
    const inUse = await isDomainInUse(domain);
    if (inUse) {
      return jsonWithETag(req, { error: "Domain is already in use" }, { status: 409 });
    }

    // Add domain to Vercel (for SSL handling)
    const vercelResult = await addDomainToVercel(domain);
    if (!vercelResult.success) {
      return jsonWithETag(req, { error: vercelResult.error || "Failed to add domain to Vercel" }, { status: 500 });
    }

    // Create domain in database
    const customDomain = await db.customDomain.create({
      data: {
        domain,
        workspaceId: workspace.id,
        verificationToken: vercelResult.verificationRecord?.value || null,
        verified: false,
        dnsConfigured: false,
      },
    });

    return jsonWithETag(
      req,
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
    return jsonWithETag(req, { error: message }, { status });
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
      return jsonWithETag(req, { error: "Domain ID is required" }, { status: 400 });
    }

    // Verify workspace access (admin only)
    const workspace = await getWorkspace(workspaceslug, session.user.id, true);

    // Get and verify domain ownership
    const customDomain = await db.customDomain.findUnique({
      where: { id: domainId },
    });

    if (!customDomain || customDomain.workspaceId !== workspace.id) {
      return jsonWithETag(req, { error: "Domain not found" }, { status: 404 });
    }

    // Remove from Vercel (continue on failure)
    const vercelResult = await removeDomainFromVercel(customDomain.domain);
    if (!vercelResult.success) {
      console.error("Failed to remove domain from Vercel:", vercelResult.error);
    }

    // Collect affected links BEFORE cascade delete, so we can mark them as deleted in Tinybird
    const affectedLinks = await db.link.findMany({
      where: { customDomainId: domainId, workspaceId: workspace.id },
      include: {
        customDomain: true,
        tags: {
          select: {
            tag: { select: { id: true } },
          },
        },
      },
    });

    if (affectedLinks.length > 0) {
      waitUntil(
        Promise.allSettled(
          affectedLinks.map((link) =>
            deleteLink({
              id: link.id,
              domain: link.customDomain?.domain || "slugy.co",
              slug: link.slug,
              url: link.url,
              workspaceId: link.workspaceId,
              createdAt: link.createdAt,
              tags: link.tags.map((t) => ({ tagId: t.tag.id })),
            }),
          ),
        ),
      );
    }

    // Delete from database
    await db.customDomain.delete({ where: { id: domainId } });

    return jsonWithETag(req, { success: true });
  } catch (error) {
    console.error("Error deleting domain:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete domain";
    const status =
      message.includes("Unauthorized") || message.includes("permissions")
        ? 403
        : 500;
    return jsonWithETag(req, { error: message }, { status });
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
      return jsonWithETag(req, { error: "Invalid JSON in request body" }, { status: 400 });
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
      return jsonWithETag(req, { error: "Domain not found" }, { status: 404 });
    }

    // Handle verify action
    if (action === "verify") {
      // Verify domain on Vercel (primary SSL provider)
      const vercelVerifyResult = await verifyDomainOnVercel(
        customDomain.domain,
      );

      // Check actual DNS configuration
      const dnsCheckResult = await checkDnsConfiguration(
        customDomain.domain,
      );

      const isVerified = vercelVerifyResult.verified;
      const isDnsConfigured = dnsCheckResult.configured;

      // Update domain in database
      const updatedDomain = await db.customDomain.update({
        where: { id: domainId },
        data: {
          verified: isVerified,
          dnsConfigured: isDnsConfigured,
          sslEnabled: isVerified && isDnsConfigured,
          lastChecked: new Date(),
        },
      });

      return jsonWithETag(req, {
        domain: updatedDomain,
        verified: isVerified,
        configured: isDnsConfigured,
        vercelVerified: vercelVerifyResult.verified,
        dnsConfigured: isDnsConfigured,
        error: !vercelVerifyResult.success
          ? vercelVerifyResult.error
          : !dnsCheckResult.success
          ? dnsCheckResult.error
          : undefined,
      });
    }

    // Handle toggle-redirect action
    if (action === "toggle-redirect") {
      const updatedDomain = await db.customDomain.update({
        where: { id: domainId },
        data: { redirectToWww: !customDomain.redirectToWww },
      });

      return jsonWithETag(req, { domain: updatedDomain });
    }

    return jsonWithETag(req, { error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating domain:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update domain";
    const status = message === "Unauthorized" ? 401 : 500;
    return jsonWithETag(req, { error: message }, { status });
  }
}
