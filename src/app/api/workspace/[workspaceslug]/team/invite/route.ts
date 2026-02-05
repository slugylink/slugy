import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { sendOrganizationInvitation } from "@/server/actions/email";
import { getWorkspaceAccess, hasRole } from "@/lib/workspace-access";

const INVITE_EXPIRY_DAYS = 7;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceslug } = await params;
    // Check workspace access (admin/owner can invite members)
    const access = await getWorkspaceAccess(session.user.id, workspaceslug);
    if (!access.success || !access.workspace || !hasRole(access.role, "admin"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const workspace = await db.workspace.findFirst({
      where: {
        id: access.workspace.id,
      },
      select: { id: true, name: true, slug: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body.role === "admin" ? "admin" : "member";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 },
      );
    }

    const inviter = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });
    if (!inviter) {
      return NextResponse.json({ error: "Inviter not found" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      const alreadyMember = await db.member.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: existingUser.id,
          },
        },
      });
      if (alreadyMember) {
        return NextResponse.json(
          { error: "This user is already a member of the workspace" },
          { status: 400 },
        );
      }
    }

    const existingInvitation = await db.invitation.findFirst({
      where: {
        workspaceId: workspace.id,
        email,
        status: "pending",
        deletedAt: null,
      },
    });
    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 },
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invitation = await db.invitation.create({
      data: {
        workspaceId: workspace.id,
        inviterId: session.user.id,
        email,
        role,
        token: crypto.randomUUID(),
        expiresAt,
      },
    });

    const inviteLink = `${process.env.NEXT_APP_URL}/accept-invitation/${invitation.id}`;
    await sendOrganizationInvitation({
      email,
      invitedByUsername: inviter.name ?? "A team member",
      invitedByEmail: inviter.email ?? "",
      teamName: workspace.name ?? "the workspace",
      inviteLink,
    });

    return NextResponse.json(
      { success: true, invitationId: invitation.id, expiresAt: invitation.expiresAt },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Team Invite]", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 },
    );
  }
}
