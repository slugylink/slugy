"use server";

import { dymo } from "@/lib/dymo";

// Improved regex aligned more closely with standard email validation
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

type ValidationResult =
  | { isValid: boolean; isFraud: boolean }
  | { error: string };

const emailValidationCache = new Map<
  string,
  { result: ValidationResult; timestamp: number }
>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function validateEmail(email: string): Promise<ValidationResult> {
  try {
    console.log("validating");
    if (!email) {
      return { error: "Email is required" };
    }

    if (!EMAIL_REGEX.test(email)) {
      return { error: "Invalid email format" };
    }

    const now = Date.now();
    const cached = emailValidationCache.get(email);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return cached.result;
    }

    // Use dymo with fallback/error-handling
    let dymoResult;
    try {
      dymoResult = await dymo.isValidData({ email });
    } catch {
      // fallback: treat as valid but warn client optionally
      return { isValid: true, isFraud: false };
    }

    const result = {
      isValid: !dymoResult.email.fraud,
      isFraud: dymoResult.email.fraud,
    };

    emailValidationCache.set(email, { result, timestamp: now });

    return result;
  } catch (error) {
    console.error("Email validation error:", error);
    return { error: "Failed to validate email" };
  }
}
