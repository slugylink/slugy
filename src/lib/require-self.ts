import "server-only";
import { getAuthSession } from "@/lib/auth";

export async function requireSelf(userId: string): Promise<void> {
  const result = await getAuthSession();
  if (!result.success || result.session.user.id !== userId) {
    throw new Error("Unauthorized");
  }
}
