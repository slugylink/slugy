"use server";

export async function createFreeSubscription(userId: string) {
  void userId;

  return {
    success: false as const,
    message: "Free plan is no longer available. Please choose a paid plan.",
  };
}
