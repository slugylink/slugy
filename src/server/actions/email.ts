import { resend } from "@/lib/resend";

// ============================================================================
// Types
// ============================================================================

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
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

function buildInvitationHtmlTemplate({
  invitedByUsername,
  invitedByEmail,
  teamName,
  inviteLink,
}: SendOrganizationInvitationParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organization Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #000;
      text-decoration: none;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background: #000;
      color: #fff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .button:hover {
      background: #333;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 30px;
    }
    .highlight {
      background: #fff;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #000;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <a href="${process.env.NEXT_BASE_URL}" class="logo">Slugy</a>
  </div>
  
  <div class="content">
    <h2>You've been invited to join ${teamName}</h2>
    
    <p>Hi there!</p>
    
    <div class="highlight">
      <strong>${invitedByUsername}</strong> (${invitedByEmail}) has invited you to join <strong>${teamName}</strong> on Slugy.
    </div>
    
    <p>Click the button below to accept the invitation:</p>
    
    <div style="text-align: center;">
      <a href="${inviteLink}" class="button">Accept Invitation</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      This invitation will expire in ${INVITATION_EXPIRY_DAYS} days.
    </p>
  </div>
  
  <div class="footer">
    <p>If you have any questions, please contact <a href="mailto:${invitedByEmail}">${invitedByEmail}</a></p>
    <p>Best regards,<br>The Slugy Team</p>
  </div>
</body>
</html>
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

export async function sendOrganizationInvitation(
  params: SendOrganizationInvitationParams,
): Promise<void> {
  const { email, teamName } = params;

  const subject = `You've been invited to join ${teamName}`;
  const text = buildInvitationTextTemplate(params);
  const html = buildInvitationHtmlTemplate(params);

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
