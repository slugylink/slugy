"use server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { sendOrganizationInvitation } from "@/server/actions/email";

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
      return { success: false, error: "User is already a member of this organization" };
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
      return { success: false, error: "No default workspace found for organization" };
    }

    // Create invitation
    const invitation = await db.invitation.create({
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

    // Send invitation email
    const inviteLink = `${process.env.NEXT_APP_URL}/accept-invitation/${invitation.id}`;
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
      .map(membership => membership.organization)
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

export async function acceptInvitation(invitationId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Find the invitation
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
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
          },
        },
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "pending") {
      return { success: false, error: "Invitation has already been processed" };
    }

    if (invitation.expiresAt < new Date()) {
      return { success: false, error: "Invitation has expired" };
    }

    // Check if user is already a member
    const existingMember = await db.member.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId,
      },
    });

    if (existingMember) {
      return { success: false, error: "You are already a member of this organization" };
    }

    // Use transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // Update invitation status
      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: "accepted" },
      });

      // Create member record
      await tx.member.create({
        data: {
          userId,
          workspaceId: invitation.workspaceId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });
    });

    return { 
      success: true, 
      organization: invitation.organization,
      workspace: invitation.workspace,
    };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getInvitationDetails(invitationId: string) {
  try {
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
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

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "pending") {
      return { success: false, error: "Invitation has already been processed" };
    }

    if (invitation.expiresAt < new Date()) {
      return { success: false, error: "Invitation has expired" };
    }

    return { 
      success: true, 
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        inviter: invitation.inviter,
        expiresAt: invitation.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error getting invitation details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
} 