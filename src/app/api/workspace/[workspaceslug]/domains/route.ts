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
import { checkDomainLimit } from "@/server/actions/limit";
import { jsonWithETag } from "@/lib/http";
import { getWorkspaceAccess, hasRole } from "@/lib/workspace-access";
import { checkDomainVerifyRateLimit } from "@/lib/middleware/rate-limit";
import { getSubscriptionWithPlan } from "@/server/actions/subscription";
import { getBasicPlanLimits } from "@/lib/subscription/limits-sync";

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
      return jsonWithETag(
        req,
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    // DNS TXT tokens are provisioning secrets — members get status only.
    const access = await getWorkspaceAccess(session.user.id, workspaceslug);
    const isOwnerOrAdmin = access.success && hasRole(access.role, "admin");

    const domains = isOwnerOrAdmin
      ? workspace.customDomains
      : workspace.customDomains.map(({ verificationToken, ...rest }) => rest);

    return jsonWithETag(req, { domains });
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

    const ownerSubscription = await getSubscriptionWithPlan(workspace.userId);
    const maxDomains =
      ownerSubscription.subscription?.plan?.maxCustomDomains ??
      (await getBasicPlanLimits()).maxCustomDomains;
    const limitCheck = await checkDomainLimit(workspace.id, maxDomains);
    if (!limitCheck.canAdd) {
      return jsonWithETag(
        req,
        { error: limitCheck.error || "Domain limit reached" },
        { status: 403 },
      );
    }

    // Check if domain is already in use
    const inUse = await isDomainInUse(domain);
    if (inUse) {
      return jsonWithETag(
        req,
        { error: "Domain is already in use" },
        { status: 409 },
      );
    }

    // Add domain to Vercel (for SSL handling)
    const vercelResult = await addDomainToVercel(domain);
    if (!vercelResult.success) {
      return jsonWithETag(
        req,
        { error: vercelResult.error || "Failed to add domain to Vercel" },
        { status: 500 },
      );
    }

    // Create domain in database — P2002 (concurrent double-add) is a 409,
    // and a DB failure after a Vercel add compensates by detaching again so
    // the domain isn't orphaned in Vercel (which would 409 every retry).
    let customDomain;
    try {
      customDomain = await db.customDomain.create({
        data: {
          domain,
          workspaceId: workspace.id,
          verificationToken: vercelResult.verificationRecord?.value || null,
          verified: false,
          dnsConfigured: false,
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return jsonWithETag(
          req,
          { error: "Domain is already in use" },
          { status: 409 },
        );
      }
      await removeDomainFromVercel(domain).catch(() => undefined);
      throw error;
    }

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
      return jsonWithETag(
        req,
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
      return jsonWithETag(req, { error: "Domain not found" }, { status: 404 });
    }

    // Deleting a domain cascade-deletes its links (schema ON DELETE CASCADE)
    // — refuse while links exist so nobody wipes live short links by
    // accident. Move or delete the links first.
    const linkCount = await db.link.count({
      where: { customDomainId: domainId, workspaceId: workspace.id },
    });
    if (linkCount > 0) {
      return jsonWithETag(
        req,
        {
          error: `This domain has ${linkCount} active short link${linkCount === 1 ? "" : "s"}. Move or delete them before deleting the domain.`,
          linkCount,
        },
        { status: 409 },
      );
    }

    // Remove from Vercel (continue on failure)
    const vercelResult = await removeDomainFromVercel(customDomain.domain);
    if (!vercelResult.success) {
      console.error("Failed to remove domain from Vercel:", vercelResult.error);
    }

    // (Link collection for Tinybird tombstones is unnecessary: the guard
    // above guarantees zero links reference this domain.)

    // Delete from database (link-count guard above guarantees no links
    // reference this domain, so nothing needs cache purging).
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
      return jsonWithETag(
        req,
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

    // Verify + toggle change verified flags and hit paid provider APIs —
    // admin-only (matches add/delete). Members are read-only.
    const workspace = await getWorkspace(workspaceslug, session.user.id, true);

    // Get and verify domain ownership
    const customDomain = await db.customDomain.findUnique({
      where: { id: domainId },
    });

    if (!customDomain || customDomain.workspaceId !== workspace.id) {
      return jsonWithETag(req, { error: "Domain not found" }, { status: 404 });
    }

    // Handle verify action
    if (action === "verify") {
      // Verification fans out to Vercel + DNS-over-HTTPS — throttle abuse.
      const verifyLimit = await checkDomainVerifyRateLimit(customDomain.domain);
      if (!verifyLimit.success) {
        return jsonWithETag(
          req,
          { error: "Too many verification attempts. Try again later." },
          { status: 429 },
        );
      }

      // Verify domain on Vercel (primary SSL provider)
      const vercelVerifyResult = await verifyDomainOnVercel(
        customDomain.domain,
      );

      // Check actual DNS configuration
      const dnsCheckResult = await checkDnsConfiguration(customDomain.domain);

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
