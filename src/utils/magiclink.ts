import { resend } from "@/lib/resend";

export async function sendMagicLinkEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: "Your Slugy Login Link",
      html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to Slugy!</h1>
            <p style="color: #666;">Click the button below to sign in to your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Sign In
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 5 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
          </div>
        `,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error("Failed to send magic link email");
    }

    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
