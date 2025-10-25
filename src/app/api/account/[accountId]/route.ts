import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";
import { invalidateWorkspaceCache } from "@/lib/cache-utils/workspace-cache";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await params;

  // Ensure the user is deleting their own account
  if (session.user.id !== context.accountId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Delete the account
    await db.user.delete({ where: { id: context.accountId } });

    // Invalidate all related caches
    await Promise.all([
      revalidateTag("workspace", 'max'),
      revalidateTag("all-workspaces", 'max'),
      revalidateTag("dbuser", 'max'),
      // Invalidate workspace cache for the deleted user
      invalidateWorkspaceCache(context.accountId),
      // Invalidate bio cache for the deleted user
      invalidateBioCache(context.accountId),
    ]);

    // Create a response
    const response = NextResponse.json(
      { message: "Account deleted successfully" },
      { status: 200 },
    );

    return response;
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await params;

  // Ensure the user is updating their own account
  if (session.user.id !== context.accountId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    await Promise.all([
      revalidateTag("workspace", 'max'),
      revalidateTag("all-workspaces", 'max'),
      // Invalidate workspace cache when default workspace changes
      invalidateWorkspaceCache(context.accountId),
    ]);

    return NextResponse.json(updatedAccount);
  } catch (error) {
    console.error("[ACCOUNT_UPDATE]", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 },
    );
  }
}
