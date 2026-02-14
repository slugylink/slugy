import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { invalidateWorkspaceCache } from "@/lib/cache-utils/workspace-cache";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache";
import { apiSuccess, apiErrors } from "@/lib/api-response";
import { polarClient } from "@/lib/polar";

// Constants
const CACHE_REVALIDATION_MODE = "max";
const NOT_FOUND_ERROR_PATTERNS = [
  "not found",
  "required but not found",
  "No record was found for a delete",
  "Record to delete does not exist",
  "An operation failed because it depends on one or more records that were required but not found",
];

// Validation schemas
const UpdateAccountSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(32, "Name must be 32 characters or less"),
  defaultWorkspaceId: z.string().optional(),
});

// Types
interface RouteParams {
  params: Promise<{ accountId: string }>;
}

const KNOWN_AUTH_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "__Host-better-auth.session_token",
];

// Utility functions
const isNotFoundError = (error: Error): boolean => {
  return NOT_FOUND_ERROR_PATTERNS.some((pattern) =>
    error.message.includes(pattern),
  );
};

const getRequestCookieNames = (req: Request): string[] => {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return [];

  const names = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim().split("=")[0])
    .filter(Boolean);

  return [...new Set(names)];
};

const getRootDomain = (hostHeader: string | null): string | null => {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0].toLowerCase();
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;

  const parts = host.split(".");
  if (parts.length < 2) return null;
  return `.${parts.slice(-2).join(".")}`;
};

const buildCookieClearHeaders = (req: Request): Headers => {
  const responseHeaders = new Headers();
  const secure = new URL(req.url).protocol === "https:";
  const requestCookieNames = getRequestCookieNames(req);
  const cookieNames = new Set([...requestCookieNames, ...KNOWN_AUTH_COOKIES]);
  const rootDomain = getRootDomain(req.headers.get("host"));
  const commonAttrs = [
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  for (const cookieName of cookieNames) {
    responseHeaders.append("Set-Cookie", `${cookieName}=; ${commonAttrs}`);
    if (rootDomain) {
      responseHeaders.append(
        "Set-Cookie",
        `${cookieName}=; ${commonAttrs}; Domain=${rootDomain}`,
      );
    }
  }

  return responseHeaders;
};

const verifyUserDeleted = async (accountId: string): Promise<boolean> => {
  try {
    const user = await db.user.findUnique({
      where: { id: accountId },
      select: { id: true },
    });
    return !user;
  } catch {
    return true; // Assume deleted if verification fails
  }
};

const deletePolarCustomer = async (customerId: string): Promise<void> => {
  try {
    console.log(`[Account Delete] Deleting Polar customer: ${customerId}`);
    await polarClient.customers.delete({ id: customerId });
    console.log(`[Account Delete] Polar customer deleted successfully`);
  } catch (error: unknown) {
    console.error(
      "[Account Delete] Failed to delete Polar customer:",
      error instanceof Error ? error.message : error,
    );
  }
};

const signOutUser = async (): Promise<void> => {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Ignore - session may already be gone
  }
};

const deleteUserAndRelatedData = async (accountId: string): Promise<void> => {
  try {
    await db.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: accountId } });
      await tx.account.deleteMany({ where: { userId: accountId } });
      await tx.user.delete({ where: { id: accountId } });
    });
  } catch (error: unknown) {
    if (!(error instanceof Error) || !isNotFoundError(error)) {
      throw error;
    }

    // Verify deletion succeeded via cascade
    const isDeleted = await verifyUserDeleted(accountId);
    if (isDeleted) {
      console.log(
        "[Account Delete] User successfully deleted via cascade operations",
      );
    } else {
      throw error;
    }
  }
};

const invalidateAccountCaches = async (accountId: string): Promise<void> => {
  await Promise.all([
    revalidateTag("workspace", CACHE_REVALIDATION_MODE),
    revalidateTag("all-workspaces", CACHE_REVALIDATION_MODE),
    revalidateTag("dbuser", CACHE_REVALIDATION_MODE),
    invalidateWorkspaceCache(accountId),
    invalidateBioCache(accountId),
  ]);
};

// Route handlers
export async function DELETE(req: Request, { params }: RouteParams) {
  // Authenticate user
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return apiErrors.unauthorized();
  }

  const { accountId } = await params;

  // Ensure the user is deleting their own account
  if (session.user.id !== accountId) {
    return apiErrors.forbidden();
  }

  try {
    // Get user and customer ID
    const user = await db.user.findUnique({
      where: { id: accountId },
      select: { id: true, customerId: true },
    });

    if (!user) {
      return apiErrors.notFound("Account not found");
    }

    // Delete from Polar if customer exists
    if (user.customerId) {
      await deletePolarCustomer(user.customerId);
    }

    // Sign out user
    await signOutUser();

    // Delete user and related data
    await deleteUserAndRelatedData(accountId);

    // Invalidate caches
    await invalidateAccountCaches(accountId);

    // Clear all cookies for this request host + root domain fallback.
    return apiSuccess(
      null,
      "Account deleted successfully",
      200,
      buildCookieClearHeaders(req),
    );
  } catch (error) {
    console.error("Account deletion error:", error);

    if (error instanceof Error) {
      // Handle cascade delete errors
      if (isNotFoundError(error)) {
        const isDeleted = await verifyUserDeleted(accountId);
        if (isDeleted) {
          console.log(
            "[Account Delete] User successfully deleted despite cascade errors",
          );
          return apiSuccess(
            null,
            "Account deleted successfully",
            200,
            buildCookieClearHeaders(req),
          );
        }
        return apiErrors.notFound(
          "Account deletion failed - user still exists",
        );
      }

      // Handle foreign key constraint errors
      if (error.message.includes("foreign key constraint")) {
        console.error(
          "[Account Delete] Foreign key constraint error:",
          error.message,
        );
        return apiErrors.internalError(
          "Account deletion failed due to data dependencies",
        );
      }
    }

    return apiErrors.internalError("Failed to delete account");
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  // Authenticate user
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return apiErrors.unauthorized();
  }

  const { accountId } = await params;

  // Ensure the user is updating their own account
  if (session.user.id !== accountId) {
    return apiErrors.forbidden();
  }

  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = UpdateAccountSchema.parse(body);

    // Update user and workspace in transaction
    const updatedAccount = await db.$transaction(async (tx) => {
      // Update user name
      const userUpdate = await tx.user.update({
        where: { id: accountId },
        data: { name: validatedData.name },
      });

      // Update default workspace if provided
      if (validatedData.defaultWorkspaceId) {
        // Clear existing default
        await tx.workspace.updateMany({
          where: { userId: accountId, isDefault: true },
          data: { isDefault: false },
        });

        // Set new default
        await tx.workspace.update({
          where: { id: validatedData.defaultWorkspaceId, userId: accountId },
          data: { isDefault: true },
        });
      }

      return userUpdate;
    });

    // Invalidate caches
    await Promise.all([
      revalidateTag("workspace", CACHE_REVALIDATION_MODE),
      revalidateTag("all-workspaces", CACHE_REVALIDATION_MODE),
      invalidateWorkspaceCache(accountId),
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
