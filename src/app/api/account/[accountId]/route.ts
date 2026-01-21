import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";
import { invalidateWorkspaceCache } from "@/lib/cache-utils/workspace-cache";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache";
import { apiSuccess, apiErrors } from "@/lib/api-response";
import { polarClient } from "@/lib/polar";

// * Delete an account
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  // Authenticate user
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return apiErrors.unauthorized();
  }

  const context = await params;

  // Ensure the user is deleting their own account
  if (session.user.id !== context.accountId) {
    return apiErrors.forbidden();
  }

  try {
    // Check if user exists and get customer ID
    const user = await db.user.findUnique({
      where: { id: context.accountId },
      select: { 
        id: true,
        customerId: true,
      },
    });

    if (!user) {
      return apiErrors.notFound("Account not found");
    }

    // Delete customer from Polar if customerId exists
    if (user.customerId) {
      try {
        console.log(`[Account Delete] Deleting Polar customer: ${user.customerId}`);
        await polarClient.customers.delete({
          id: user.customerId,
        });
        console.log(`[Account Delete] Polar customer deleted successfully`);
      } catch (polarError: any) {
        // Log error but don't fail the account deletion
        // Customer might already be deleted or not exist in Polar
        console.error("[Account Delete] Failed to delete Polar customer:", polarError.message || polarError);
        // Continue with account deletion even if Polar delete fails
      }
    }

    // Delete the account
    // Note: Prisma cascade deletes will automatically remove related records (Session, Account, Subscription, etc.)
    // better-auth may try to clean up these records after deletion, which can cause
    // "record not found" errors, but these are harmless since cascade delete already handled it
    await db.user.delete({ where: { id: context.accountId } });

    // Invalidate all related caches
    // Use "max" as path parameter to avoid cacheLife configuration requirement
    await Promise.all([
      revalidateTag("workspace", "max"),
      revalidateTag("all-workspaces", "max"),
      revalidateTag("dbuser", "max"),
      // Invalidate workspace cache for the deleted user
      invalidateWorkspaceCache(context.accountId),
      // Invalidate bio cache for the deleted user
      invalidateBioCache(context.accountId),
    ]);

    return apiSuccess(null, "Account deleted successfully");
  } catch (error) {
    console.error("Account deletion error:", error);
    // Handle Prisma errors
    if (error instanceof Error) {
      // Check if it's a "record not found" error from better-auth cleanup
      // These are expected when using cascade deletes - better-auth tries to clean up
      // records that were already deleted by Prisma cascade, which is harmless
      if (
        error.message.includes("not found") ||
        error.message.includes("required but not found") ||
        error.message.includes("No record was found for a delete")
      ) {
        // If it's a better-auth cleanup error after successful deletion, return success
        // The user was deleted successfully, better-auth just couldn't find records to clean up
        return apiSuccess(null, "Account deleted successfully");
      }
      // If user doesn't exist, return not found
      if (error.message.includes("Record to delete does not exist")) {
        return apiErrors.notFound("Account not found");
      }
    }
    return apiErrors.internalError("Failed to delete account");
  }
}

// Input validation schema
const UpdateAccountSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(32, "Name must be 32 characters or less"),
  defaultWorkspaceId: z.string().optional(),
});

//* Update an account (name, workspace isDefault)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  // Authenticate user
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return apiErrors.unauthorized();
  }

  const context = await params;

  // Ensure the user is updating their own account
  if (session.user.id !== context.accountId) {
    return apiErrors.forbidden();
  }

  try {
    // Parse and validate request body
    const body = (await req.json()) as {
      name: string;
      defaultWorkspaceId?: string;
    };
    const validatedData = UpdateAccountSchema.parse(body);

    // Start a transaction to handle multiple updates
    const updatedAccount = await db.$transaction(async (prisma) => {
      // Update user name
      const userUpdate = await prisma.user.update({
        where: { id: context.accountId },
        data: {
          name: validatedData.name,
        },
      });

      // Update default workspace if provided
      if (validatedData.defaultWorkspaceId) {
        // First, reset all workspaces to non-default
        await prisma.workspace.updateMany({
          where: {
            userId: context.accountId,
            isDefault: true,
          },
          data: { isDefault: false },
        });

        // Then set the new default workspace
        await prisma.workspace.update({
          where: {
            id: validatedData.defaultWorkspaceId,
            userId: context.accountId,
          },
          data: { isDefault: true },
        });
      }

      return userUpdate;
    });

    // Invalidate related caches
    // Use "max" as path parameter to avoid cacheLife configuration requirement
    await Promise.all([
      revalidateTag("workspace", "max"),
      revalidateTag("all-workspaces", "max"),
      // Invalidate workspace cache when default workspace changes
      invalidateWorkspaceCache(context.accountId),
    ]);

    return apiSuccess(updatedAccount);
  } catch (error) {
    console.error("[ACCOUNT_UPDATE]", error);
    if (error instanceof z.ZodError) {
      return apiErrors.validationError(error.errors, "Invalid input data");
    }
    return apiErrors.internalError("Failed to update account");
  }
}
