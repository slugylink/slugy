"use server";
import {
  withWorkspaceQuota,
  assertSeatAvailable,
} from "@/lib/subscription/workspace-quota";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { sendOrganizationInvitation } from "@/server/actions/email";
import { revalidateWorkspaceData } from "@/lib/layout-utils";

export async function createOrganization({
  name,
  slug,
  logo,
}: {
  name: string;
  slug: string;
  logo?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Check if organization slug already exists
    const existingOrganization = await db.organization.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (existingOrganization) {
      return {
        success: false,
        error: "Organization slug already exists, try a different one",
        slugExists: true,
      };
    }

    // Use transaction to ensure data consistency
    const organization = await db.$transaction(async (tx) => {
      // Create the organization
      const newOrganization = await tx.organization.create({
        data: {
          name,
          slug,
          logo,
        },
      });

      // Create a default workspace for the organization
      const defaultWorkspace = await tx.workspace.create({
        data: {
          userId,
          name: `${name} Workspace`,
          slug: `${slug}-workspace`,
          isDefault: true,
        },
      });

      // Create a member record linking the user to both organization and workspace
      await tx.member.create({
        data: {
          userId,
          workspaceId: defaultWorkspace.id,
          organizationId: newOrganization.id,
          role: "owner",
        },
      });

      return newOrganization;
    });

    // Ensure workspace switchers/default workspace views are fresh immediately.
    await revalidateWorkspaceData(userId);

    return { success: true, organization };
  } catch (error) {
    console.error("Error creating organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function inviteMember({
  email,
  role,
  organizationId,
}: {
  email: string;
  role: "admin" | "member" | "owner";
  organizationId: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // The caller must belong to the organization — otherwise any signed-in
    // user can mint invitations (including owner-role) for any org.
    const callerMembership = await db.member.findFirst({
      where: { organizationId, userId },
      select: { role: true },
    });

    if (
      !callerMembership ||
      (callerMembership.role !== "owner" && callerMembership.role !== "admin")
    ) {
      return { success: false, error: "Forbidden" };
    }

    if (role === "owner" && callerMembership.role !== "owner") {
      return { success: false, error: "Only owners can invite owners" };
    }

    // Get organization details
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });

    if (!organization) {
      return { success: false, error: "Organization not found" };
    }

    // Check if user is already a member of this organization
    const existingMember = await db.member.findFirst({
      where: {
        organizationId,
        user: { email },
      },
      include: { user: true },
    });

    if (existingMember) {
      return {
        success: false,
        error: "User is already a member of this organization",
      };
    }

    // Check if there's already a pending invitation
    const existingInvitation = await db.invitation.findFirst({
      where: {
        organizationId,
        email,
        status: "pending",
      },
    });

    if (existingInvitation) {
      return { success: false, error: "Invitation already sent to this email" };
    }

    // Get inviter details
    const inviter = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!inviter) {
      return { success: false, error: "Inviter not found" };
    }

    // Get the default workspace for this organization
    const defaultWorkspace = await db.workspace.findFirst({
      where: {
        members: {
          some: {
            organizationId,
            role: "owner",
          },
        },
      },
      select: { id: true },
    });

    if (!defaultWorkspace) {
      return {
        success: false,
        error: "No default workspace found for organization",
      };
    }

    // Create invitation
    const invitation = await withWorkspaceQuota(
      defaultWorkspace.id,
      async (tx, plan) => {
        await assertSeatAvailable(tx, defaultWorkspace.id, plan.maxUsers, true);
        return tx.invitation.create({
          data: {
            organizationId,
            workspaceId: defaultWorkspace.id,
            inviterId: userId,
            email,
            role,
            token: crypto.randomUUID(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });
      },
    );

    // Send invitation email
    const inviteLink = `${process.env.NEXT_APP_URL}/accept-invitation/${invitation.token}`;
    await sendOrganizationInvitation({
      email,
      invitedByUsername: inviter.name,
      invitedByEmail: inviter.email,
      teamName: organization.name,
      inviteLink,
    });

    return { success: true, invitation };
  } catch (error) {
    console.error("Error inviting member:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getOrganizations() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Get organizations where user is a member
    const memberships = await db.member.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
    });

    const organizations = memberships
      .map((membership) => membership.organization)
      .filter(Boolean);

    return { success: true, organizations };
  } catch (error) {
    console.error("Error getting organizations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Invite lookup by unguessable `token`, with legacy `id` fallback for links
 * emailed before token URLs. Callers must still gate on the invitee email —
 * the id form is cuid-enumerable.
 */
async function findInvitationByKey(key: string) {
  return db.invitation.findFirst({
    where: { OR: [{ token: key }, { id: key }] },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          userId: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

function viewerEmailMatches(
  viewerEmail: string | null | undefined,
  invitationEmail: string,
): boolean {
  return (
    typeof viewerEmail === "string" &&
    viewerEmail.toLowerCase() === invitationEmail.toLowerCase()
  );
}

export async function acceptInvitation(invitationKey: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false as const,
        error: "Unauthorized",
        unauthorized: true as const,
      };
    }

    const userId = session.user.id;

    // Find the invitation (token preferred, legacy id accepted)
    const invitation = await findInvitationByKey(invitationKey);

    if (!invitation) {
      return { success: false as const, error: "Invitation not found" };
    }

    if (invitation.status !== "pending") {
      return {
        success: false as const,
        error: "Invitation has already been processed",
      };
    }

    if (invitation.expiresAt < new Date()) {
      // Best-effort status hygiene so expired rows stop showing as pending.
      await db.invitation
        .update({
          where: { id: invitation.id },
          data: { status: "expired" },
        })
        .catch(() => undefined);
      return { success: false as const, error: "Invitation has expired" };
    }

    // Email ownership is required on EVERY path (workspace and org) — the
    // invite link is bearer-capable, so only the invitee may redeem it.
    if (!viewerEmailMatches(session.user.email, invitation.email)) {
      return {
        success: false as const,
        error: "You must be signed in with the invited email address to accept",
      };
    }

    const isWorkspaceOnly = invitation.organizationId == null;

    const existingMember = await db.member.findFirst({
      where: isWorkspaceOnly
        ? { workspaceId: invitation.workspaceId, userId }
        : { organizationId: invitation.organizationId, userId },
    });

    if (existingMember) {
      return {
        success: false as const,
        error: isWorkspaceOnly
          ? "You are already a member of this workspace"
          : "You are already a member of this organization",
      };
    }

    // Seat check + member insert run in one transaction so a burst of accepts
    // can't overfill past the owner's plan (TOCTOU at invite time).
    try {
      await withWorkspaceQuota(invitation.workspaceId, async (tx, plan) => {
        const fresh = await tx.invitation.findUnique({
          where: { id: invitation.id },
          select: { status: true, expiresAt: true, deletedAt: true },
        });
        if (
          !fresh ||
          fresh.status !== "pending" ||
          fresh.deletedAt ||
          fresh.expiresAt <= new Date()
        ) {
          throw new Error("INVITATION_PROCESSED");
        }

        await assertSeatAvailable(
          tx,
          invitation.workspaceId,
          plan.maxUsers,
          false,
        );

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        });
        await tx.member.create({
          data: {
            userId,
            workspaceId: invitation.workspaceId,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });
      });
    } catch (txError) {
      const code = txError instanceof Error ? txError.message : "";
      if (code === "WORKSPACE_FULL") {
        return {
          success: false as const,
          error:
            "This workspace has reached its member limit. Ask the owner to upgrade.",
        };
      }
      if (code === "INVITATION_PROCESSED") {
        return {
          success: false as const,
          error: "Invitation has already been processed",
        };
      }
      throw txError;
    }

    // Revalidate workspace-related caches so newly joined workspaces appear in switchers
    await revalidateWorkspaceData(userId);

    return {
      success: true as const,
      organization: invitation.organization,
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
        slug: invitation.workspace.slug,
      },
    };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function declineInvitation(invitationKey: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false as const,
        error: "Unauthorized",
        unauthorized: true as const,
      };
    }

    const invitation = await findInvitationByKey(invitationKey);

    if (!invitation) {
      return { success: false as const, error: "Invitation not found" };
    }

    if (invitation.status !== "pending") {
      return {
        success: false as const,
        error: "Invitation has already been processed",
      };
    }

    if (invitation.expiresAt < new Date()) {
      await db.invitation
        .update({
          where: { id: invitation.id },
          data: { status: "expired" },
        })
        .catch(() => undefined);
      return { success: false as const, error: "Invitation has expired" };
    }

    if (!viewerEmailMatches(session.user.email, invitation.email)) {
      return {
        success: false as const,
        error:
          "You must be signed in with the invited email address to decline",
      };
    }

    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "declined" },
    });

    return { success: true as const };
  } catch (error) {
    console.error("Error declining invitation:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getInvitationDetails(invitationKey: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        success: false as const,
        error: "Please log in to view this invitation",
        unauthorized: true as const,
      };
    }

    const invitation = await findInvitationByKey(invitationKey);

    // Email-gated: strangers probing ids/tokens learn nothing — not even
    // whether the invitation exists. Only the invitee sees details.
    if (
      !invitation ||
      !viewerEmailMatches(session.user.email, invitation.email)
    ) {
      return { success: false as const, error: "Invitation not found" };
    }

    if (invitation.status !== "pending") {
      return {
        success: false as const,
        error: "Invitation has already been processed",
      };
    }

    if (invitation.expiresAt < new Date()) {
      return { success: false as const, error: "Invitation has expired" };
    }

    return {
      success: true as const,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
          slug: invitation.workspace.slug,
        },
        inviter: invitation.inviter,
        expiresAt: invitation.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error getting invitation details:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
