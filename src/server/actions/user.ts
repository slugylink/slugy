"use server";
import { db } from "@/server/db";

export async function getUser(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
    });
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
