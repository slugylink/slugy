import { resend } from "@/lib/resend";
import { templates } from "@/constants/email-templates";

// ============================================================================
// Types
// ============================================================================

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SendWorkspaceWelcomeEmailParams {
  to: string;
  name?: string | null;
  workspaceName: string;
  workspaceSlug: string;
}

interface SendOrganizationInvitationParams {
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  teamName: string;
  inviteLink: string;
}

// ============================================================================
// Constants
// ============================================================================

const INVITATION_EXPIRY_DAYS = 7;

const getAppBaseUrl = () =>
  process.env.NEXT_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_BASE_URL ||
  "http://localhost:3000";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

// ============================================================================
// Email Templates
// ============================================================================

function buildInvitationTextTemplate({
  invitedByUsername,
  invitedByEmail,
  teamName,
  inviteLink,
}: SendOrganizationInvitationParams): string {
  return `
Hi there!

${invitedByUsername} (${invitedByEmail}) has invited you to join ${teamName} on Slugy.

Click the following link to accept the invitation:
${inviteLink}

This invitation will expire in ${INVITATION_EXPIRY_DAYS} days.

If you have any questions, please contact ${invitedByEmail}.

Best regards,
The Slugy Team
  `.trim();
}

// ============================================================================
// Email Sending
// ============================================================================

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailParams): Promise<unknown> {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      text,
      html: html || text,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error("Failed to send email");
    }

    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export async function sendWorkspaceWelcomeEmail({
  to,
  name,
  workspaceName,
  workspaceSlug,
}: SendWorkspaceWelcomeEmailParams): Promise<void> {
  const safeWorkspaceName = workspaceName.trim() || "your workspace";
  const displayName = name?.trim() || "there";
  const dashboardUrl = `${getAppBaseUrl()}/${workspaceSlug}`;

  const html = templates.welcome({
    name: escapeHtml(displayName),
    workspaceName: escapeHtml(safeWorkspaceName),
    dashboardUrl,
  });

  const text = `Welcome to ${safeWorkspaceName} on slugy! You can now start creating short links, track analytics, and explore bio links. Open your workspace at ${dashboardUrl}`;

  await sendEmail({
    to,
    subject: `Welcome to ${safeWorkspaceName}`,
    text,
    html,
  });
}

export async function sendOrganizationInvitation(
  params: SendOrganizationInvitationParams,
): Promise<void> {
  const { email, teamName } = params;

  const subject = `You've been invited to join ${teamName}`;
  const text = buildInvitationTextTemplate(params);
  const html = templates["workspace-invitation"]({
    inviterName: escapeHtml(params.invitedByUsername.trim() || "Someone"),
    workspaceName: escapeHtml(params.teamName.trim() || "a workspace"),
    inviteLink: params.inviteLink,
    expiryDays: INVITATION_EXPIRY_DAYS,
  });

  try {
    await sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error("Failed to send organization invitation email:", error);
    throw error;
  }
}
