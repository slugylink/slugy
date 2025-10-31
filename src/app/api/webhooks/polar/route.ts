import { Webhooks } from "@polar-sh/nextjs";
import { NextResponse } from "next/server";
import { jsonWithETag } from "@/lib/http";

// Validate Polar webhook secret
const validateWebhookSecret = (secret: string | undefined) => {
  if (!secret) return { valid: false, error: "POLAR_WEBHOOK_SECRET is not set" };
  if (secret.length < 10) return { valid: false, error: "POLAR_WEBHOOK_SECRET appears to be invalid" };
  return { valid: true };
};

const secretValidation = validateWebhookSecret(process.env.POLAR_WEBHOOK_SECRET);
if (!secretValidation.valid) {
  console.warn(`Polar webhooks disabled: ${secretValidation.error}`);
}

export const POST = secretValidation.valid
  ? Webhooks({
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
    onPayload: async (payload) => {
      console.log("Polar webhook payload:", payload);
    },
  })
  : async (req: Request) => {
    return jsonWithETag(
      req,
      { error: "Webhook service is not configured properly" },
      { status: 503 }
    );
  };
