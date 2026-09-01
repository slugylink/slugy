"use server";

import { getAuthSession } from "@/lib/auth";
import {
  ONBOARDING_USE_CASE_VALUES,
  type OnboardingUseCaseValue,
} from "@/constants/onboarding";
import { db } from "@/server/db";

function isOnboardingUseCase(value: string): value is OnboardingUseCaseValue {
  return ONBOARDING_USE_CASE_VALUES.includes(value as OnboardingUseCaseValue);
}

export async function saveOnboardingUseCase(useCase: string) {
  try {
    const authResult = await getAuthSession();
    if (!authResult.success) {
      return { success: false as const, error: "Unauthorized" };
    }

    if (!isOnboardingUseCase(useCase)) {
      return {
        success: false as const,
        error: "Please select a valid option.",
      };
    }

    await db.user.update({
      where: { id: authResult.session.user.id },
      data: { intendedUse: useCase },
    });

    return { success: true as const };
  } catch (error) {
    console.error("Error saving onboarding use case:", error);
    return {
      success: false as const,
      error: "Could not save your answer. Please try again.",
    };
  }
}
