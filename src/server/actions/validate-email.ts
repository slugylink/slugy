"use server";

import { dymo } from "@/lib/dymo";

// ============================================================================
// Types
// ============================================================================

type ValidationResult =
  | { isValid: boolean; isFraud: boolean }
  | { error: string };

interface CacheEntry {
  result: ValidationResult;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

// Email regex aligned with standard email validation (RFC 5322)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// Cache
// ============================================================================

const emailValidationCache = new Map<string, CacheEntry>();

function getCachedResult(email: string): ValidationResult | null {
  const cached = emailValidationCache.get(email);

  if (!cached) return null;

  const now = Date.now();
  const isExpired = now - cached.timestamp >= CACHE_DURATION_MS;

  if (isExpired) {
    emailValidationCache.delete(email);
    return null;
  }

  return cached.result;
}

function setCachedResult(email: string, result: ValidationResult): void {
  emailValidationCache.set(email, {
    result,
    timestamp: Date.now(),
  });
}

// ============================================================================
// Validation
// ============================================================================

function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

async function checkEmailWithDymo(email: string): Promise<ValidationResult> {
  try {
    const dymoResult = await dymo.isValidData({ email });

    return {
      isValid: !dymoResult.email.fraud,
      isFraud: dymoResult.email.fraud,
    };
  } catch (error) {
    console.error("Dymo validation error:", error);
    // Fallback: treat as valid if service is unavailable
    return { isValid: true, isFraud: false };
  }
}

// ============================================================================
// Main Function
// ============================================================================

export async function validateEmail(email: string): Promise<ValidationResult> {
  try {
    // Validate input
    if (!email) {
      return { error: "Email is required" };
    }

    if (!isValidEmailFormat(email)) {
      return { error: "Invalid email format" };
    }

    // Check cache
    const cachedResult = getCachedResult(email);
    if (cachedResult) {
      return cachedResult;
    }

    // Validate with Dymo
    const result = await checkEmailWithDymo(email);

    // Cache result
    setCachedResult(email, result);

    return result;
  } catch (error) {
    console.error("Email validation error:", error);
    return { error: "Failed to validate email" };
  }
}
