import { Checkout } from "@polar-sh/nextjs";
import { NextResponse } from "next/server";

// Validate Polar access token
const validatePolarToken = (token: string | undefined) => {
  if (!token) return { valid: false, error: "POLAR_ACCESS_TOKEN is not set" };
  if (token.length < 20) return { valid: false, error: "POLAR_ACCESS_TOKEN appears to be invalid" };
  return { valid: true };
};

const tokenValidation = validatePolarToken(process.env.POLAR_ACCESS_TOKEN);
if (!tokenValidation.valid) {
  console.warn(`Checkout disabled: ${tokenValidation.error}`);
}

export const GET = tokenValidation.valid
  ? Checkout({
      accessToken: process.env.POLAR_ACCESS_TOKEN!,
      successUrl: process.env.NODE_ENV === "production" 
        ? "https://app.slugy.co/dashboard" 
        : "http://app.localhost:3000/dashboard",
      server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
    })
  : async () => {
      return NextResponse.json(
        { error: "Checkout service is not configured properly" },
        { status: 503 }
      );
    };
