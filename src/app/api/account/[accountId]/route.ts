import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { verifyPassword } from "better-auth/crypto";

import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { invalidateWorkspaceCache } from "@/lib/cache-utils/workspace-cache";
import { invalidateBioCache } from "@/lib/cache-utils/bio-cache";
import { apiSuccess, apiErrors } from "@/lib/api-response";
import { polarClient } from "@/lib/polar";
import { invalidateSessionPresenceCache } from "@/lib/middleware/get-session";
import { checkAccountDeleteRateLimit } from "@/lib/middleware/rate-limit";
import { invalidateLinkCacheBatch } from "@/lib/cache-utils/link-cache";
import { invalidateMultipleBioPublicCache } from "@/lib/cache-utils/bio-public-cache";
import { removeDomainFromVercel } from "@/lib/domain-utils";
import { deleteLink as tombstoneLinkInTinybird } from "@/lib/tinybird/slugy-links-metadata";

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
    .min(3, "Name must be at least 3 characters")
    .max(32, "Name must be 32 characters or less"),
  defaultWorkspaceId: z.string().optional(),
});

// Account deletion requires typing DELETE plus, for password accounts,
// re-entering the current password (stolen-session / unattended-browser
// protection). OAuth-only accounts have no password to check.
const DeleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
  currentPassword: z.string().optional(),
});

// Types
interface RouteParams {
  params: Promise<{ accountId: string }>;
}

const KNOWN_AUTH_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "__Host-better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_data",
  "slugy_workspace",
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

/**
 * Clear auth cookies in a way browsers will accept.
 * Must match original cookie Path/Domain/Secure/HttpSameSite or the cookie stays.
 * crossSubDomainCookies means Domain=.slugy.co — clear both host-only and root domain.
 */
const buildCookieClearHeaders = (req: Request): Headers => {
  const responseHeaders = new Headers();
  const secure = new URL(req.url).protocol === "https:";
  const requestCookieNames = getRequestCookieNames(req);
  const cookieNames = new Set([...requestCookieNames, ...KNOWN_AUTH_COOKIES]);
  const rootDomain = getRootDomain(req.headers.get("host"));

  const appendClear = (cookieName: string, domain?: string) => {
    const parts = [
      `${cookieName}=`,
      "Path=/",
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      "SameSite=Lax",
    ];
    if (cookieName !== "slugy_workspace") {
      parts.push("HttpOnly");
    }
    if (secure) parts.push("Secure");
    if (domain) parts.push(`Domain=${domain}`);
    responseHeaders.append("Set-Cookie", parts.join("; "));
  };

  for (const cookieName of cookieNames) {
    // Host-only clear
    appendClear(cookieName);
    // Cross-subdomain clear (better-auth advanced.crossSubDomainCookies)
    if (rootDomain && !cookieName.startsWith("__Host-")) {
      appendClear(cookieName, rootDomain);
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
    await polarClient.customers.delete({ id: customerId });
  } catch (error: unknown) {
    // Fail CLOSED: the user row must not disappear while Polar still bills.
    Sentry.captureException(error, {
      tags: { flow: "account-delete", step: "polar-customer-delete" },
      extra: { customerId },
    });
    throw error;
  }
};

/**
 * Revoke every live Polar subscription for the customer, then verify none
 * remain. Fail-closed (throws) so billing can never outlive the account.
 * Already-inactive rows are tolerated for retry safety.
 */
const revokePolarSubscriptions = async (
  customerId: string | null,
  knownSubscriptionIds: Array<string | null | undefined>,
): Promise<void> => {
  const ids = new Set<string>();
  for (const id of knownSubscriptionIds) {
    if (id) ids.add(id);
  }

  if (customerId) {
    const iterator = await polarClient.subscriptions.list({
      customerId,
      limit: 20,
    });
    for await (const page of iterator) {
      for (const item of page.result?.items ?? []) {
        const status = item.status?.toLowerCase?.() ?? "";
        if (item.id && (status === "active" || status === "trialing")) {
          ids.add(item.id);
        }
      }
    }
  }

  for (const id of ids) {
    try {
      await polarClient.subscriptions.revoke({ id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // Retry-safe: revoking twice (or a remotely-ended sub) is success.
      if (/inactive|revok|cancel|not found|does not exist/i.test(message)) {
        continue;
      }
      Sentry.captureException(error, {
        tags: { flow: "account-delete", step: "polar-subscription-revoke" },
        extra: { customerId, subscriptionId: id },
      });
      throw error;
    }
  }

  // Verify: fail closed if anything is still billable.
  if (customerId) {
    const iterator = await polarClient.subscriptions.list({
      customerId,
      limit: 20,
    });
    for await (const page of iterator) {
      for (const item of page.result?.items ?? []) {
        const status = item.status?.toLowerCase?.() ?? "";
        if (status === "active" || status === "trialing") {
          const error = new Error(
            `Polar subscription still active after revoke: ${item.id}`,
          );
          Sentry.captureException(error, {
            tags: { flow: "account-delete", step: "polar-revoke-verify" },
            extra: { customerId, subscriptionId: item.id },
          });
          throw error;
        }
      }
    }
  }
};

const signOutUser = async (): Promise<void> => {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Ignore - session may already be gone
  }
};

/** Structured audit trail: console (ships to Vercel logs) + Sentry. */
const auditAccountDeletion = (
  event: string,
  fields: Record<string, unknown>,
): void => {
  console.info(JSON.stringify({ event, ...fields }));
  Sentry.captureMessage(`account-delete: ${event}`, {
    level:
      event.includes("failed") || event.includes("blocked")
        ? "warning"
        : "info",
    extra: fields,
  });
};

const captureRouteError = (
  error: unknown,
  step: string,
  extra?: Record<string, unknown>,
): void => {
  console.error(`[Account Delete] ${step}:`, error);
  Sentry.captureException(error, {
    tags: { flow: "account-delete", step },
    ...(extra ? { extra } : {}),
  });
};

/**
 * Delete the user and everything reachable. Explicit pre-cleanup covers
 * databases whose FK migration hasn't applied yet; post-migration the DB
 * cascades do the same work (both are idempotent).
 */
const deleteUserAndRelatedData = async (
  accountId: string,
  ownedWorkspaceIds: string[],
): Promise<void> => {
  try {
    await db.$transaction(async (tx) => {
      // Rows whose FK has (or had) no onDelete — delete/null BEFORE user.
      await tx.workspaceApiKey.deleteMany({
        where: { createdBy: accountId },
      });
      await tx.link.updateMany({
        where: { userId: accountId },
        data: { userId: null },
      });
      await tx.member.deleteMany({ where: { userId: accountId } });
      if (ownedWorkspaceIds.length > 0) {
        await tx.usage.deleteMany({
          where: { workspaceId: { in: ownedWorkspaceIds } },
        });
        await tx.workspace.deleteMany({
          where: { id: { in: ownedWorkspaceIds } },
        });
      }
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
    if (!isDeleted) {
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

interface DeletableAssets {
  ownedWorkspaceIds: string[];
  links: Array<{
    id: string;
    slug: string;
    domain: string;
    url: string;
    workspaceId: string;
    createdAt: Date;
    tagIds: string[];
  }>;
  fileKeys: string[];
  customDomains: string[];
  cloudflareHostnameIds: string[];
  bioUsernames: string[];
}

/** Stored file fields hold R2 keys or full URLs — normalize to object keys. */
const extractR2Key = (value: string | null | undefined): string | null => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const path = new URL(trimmed).pathname.replace(/^\/+/, "");
      return path || null;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
};

/** Gather everything the DB delete will orphan (files, domains, caches). */
const collectDeletableAssets = async (
  accountId: string,
): Promise<DeletableAssets> => {
  const [workspaces, links, bios, galleryImages] = await Promise.all([
    db.workspace.findMany({
      where: { userId: accountId },
      select: { id: true, slug: true, logo: true },
    }),
    db.link.findMany({
      where: { workspace: { userId: accountId } },
      select: {
        id: true,
        slug: true,
        domain: true,
        url: true,
        image: true,
        workspaceId: true,
        createdAt: true,
        tags: { select: { tag: { select: { id: true } } } },
      },
    }),
    db.bio.findMany({
      where: { userId: accountId },
      select: { username: true, logo: true },
    }),
    db.bioGalleryImage.findMany({
      where: { bio: { userId: accountId } },
      select: { image: true },
    }),
  ]);

  const ownedWorkspaceIds = workspaces.map((w) => w.id);
  const customDomains =
    ownedWorkspaceIds.length > 0
      ? await db.customDomain.findMany({
          where: { workspaceId: { in: ownedWorkspaceIds } },
          select: { domain: true, cloudflareCustomHostnameId: true },
        })
      : [];

  const fileKeys = new Set<string>();
  for (const value of [
    ...workspaces.map((w) => w.logo),
    ...links.map((l) => l.image),
    ...bios.map((b) => b.logo),
    ...galleryImages.map((g) => g.image),
  ]) {
    const key = extractR2Key(value);
    if (key) fileKeys.add(key);
  }

  return {
    ownedWorkspaceIds,
    links: links.map((link) => ({
      id: link.id,
      slug: link.slug,
      domain: link.domain,
      url: link.url,
      workspaceId: link.workspaceId,
      createdAt: link.createdAt,
      tagIds: link.tags.map((t) => t.tag.id),
    })),
    fileKeys: [...fileKeys],
    customDomains: customDomains.map((d) => d.domain),
    cloudflareHostnameIds: customDomains
      .map((d) => d.cloudflareCustomHostnameId)
      .filter((id): id is string => Boolean(id)),
    bioUsernames: bios.map((b) => b.username),
  };
};

/**
 * Best-effort external cleanup AFTER the DB delete commits. Nothing here may
 * throw — each step reports to Sentry and the rest continue.
 */
const cleanupExternalAssets = async (
  accountId: string,
  assets: DeletableAssets,
): Promise<void> => {
  // R2 objects (lazy import: the module throws without bucket env).
  if (assets.fileKeys.length > 0) {
    try {
      const { s3Service } = await import("@/lib/s3-service");
      const results = await Promise.allSettled(
        assets.fileKeys.map((key) => s3Service.deleteFile(key)),
      );
      results.forEach((result, i) => {
        if (result.status === "rejected") {
          Sentry.captureException(result.reason, {
            tags: { flow: "account-delete", step: "r2-delete" },
            extra: { accountId, key: assets.fileKeys[i] },
          });
        }
      });
    } catch (error) {
      captureRouteError(error, "r2-cleanup", { accountId });
    }
  }

  // Vercel project domains must be detached (no Cloudflare hostname helper
  // exists — those ids are Sentry-logged below for manual removal).
  for (const domain of assets.customDomains) {
    try {
      const result = await removeDomainFromVercel(domain);
      if (!result.success) {
        Sentry.captureMessage("account-delete: vercel domain removal failed", {
          level: "warning",
          extra: { accountId, domain, error: result.error },
        });
      }
    } catch (error) {
      captureRouteError(error, "vercel-domain-removal", {
        accountId,
        domain,
      });
    }
  }

  if (assets.cloudflareHostnameIds.length > 0) {
    Sentry.captureMessage(
      "account-delete: Cloudflare custom hostnames need manual removal",
      {
        level: "warning",
        extra: {
          accountId,
          hostnameIds: assets.cloudflareHostnameIds,
        },
      },
    );
  }

  // Tinybird metadata tombstones so pipes stop resolving deleted links.
  // Click events are immutable history; metadata flips deleted=1.
  const TOMBSTONE_CHUNK = 100;
  for (let i = 0; i < assets.links.length; i += TOMBSTONE_CHUNK) {
    const chunk = assets.links.slice(i, i + TOMBSTONE_CHUNK);
    const results = await Promise.allSettled(
      chunk.map((link) =>
        tombstoneLinkInTinybird({
          id: link.id,
          domain: link.domain,
          slug: link.slug,
          url: link.url,
          workspaceId: link.workspaceId,
          createdAt: link.createdAt,
          tags: link.tagIds.map((tagId) => ({ tagId })),
        }),
      ),
    );
    results.forEach((result, j) => {
      if (result.status === "rejected") {
        Sentry.captureException(result.reason, {
          tags: { flow: "account-delete", step: "tinybird-tombstone" },
          extra: { accountId, linkId: chunk[j]?.id },
        });
      }
    });
  }

  // Redis: per-link caches (grouped by domain) + public bio galleries.
  try {
    const byDomain = new Map<string, string[]>();
    for (const link of assets.links) {
      const list = byDomain.get(link.domain) ?? [];
      list.push(link.slug);
      byDomain.set(link.domain, list);
    }
    await Promise.all([
      ...Array.from(byDomain.entries()).map(([domain, slugs]) =>
        invalidateLinkCacheBatch(slugs, domain),
      ),
      assets.bioUsernames.length > 0
        ? invalidateMultipleBioPublicCache(assets.bioUsernames)
        : Promise.resolve(),
    ]);
  } catch (error) {
    captureRouteError(error, "redis-cleanup", { accountId });
  }
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

  // Strict per-user throttle (5/hr, fail-closed on Redis outage).
  const deleteLimit = await checkAccountDeleteRateLimit(accountId);
  if (!deleteLimit.success) {
    auditAccountDeletion("blocked.rate-limit", { accountId });
    if (deleteLimit.unavailable) {
      return apiErrors.serviceUnavailable(
        "Account deletion is temporarily unavailable. Please try again later.",
      );
    }
    const retryAfter = Math.max(
      1,
      Math.ceil((deleteLimit.reset - Date.now()) / 1000),
    );
    return apiErrors.rateLimitExceeded(retryAfter);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = DeleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrors.validationError(
        parsed.error.flatten(),
        "Type DELETE to confirm account deletion",
      );
    }

    // Get user, providers, and billing pointers
    const user = await db.user.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        customerId: true,
        accounts: { select: { providerId: true, password: true } },
        subscription: {
          select: { customerId: true, subscriptionId: true },
        },
      },
    });

    if (!user) {
      return apiErrors.notFound("Account not found");
    }

    // Sole-owner guard: deleting would cascade-wipe workspaces other members
    // still use. Transfer ownership (or remove members) first.
    const sharedOwned = await db.workspace.findMany({
      where: {
        userId: accountId,
        deletedAt: null,
        members: { some: { userId: { not: accountId } } },
      },
      select: {
        slug: true,
        _count: { select: { members: true } },
      },
    });
    if (sharedOwned.length > 0) {
      auditAccountDeletion("blocked.shared-workspaces", {
        accountId,
        workspaces: sharedOwned.map((w) => w.slug),
      });
      return apiErrors.conflict(
        "You own workspaces with other members. Transfer ownership or remove all members before deleting your account.",
        { workspaces: sharedOwned },
      );
    }

    // Re-authentication for password accounts (stolen-session protection).
    const credentialAccount = user.accounts.find(
      (account) => account.providerId === "credential",
    );
    if (credentialAccount) {
      if (!parsed.data.currentPassword) {
        return apiErrors.badRequest("Current password is required");
      }
      if (!credentialAccount.password) {
        captureRouteError(
          new Error("Credential account without stored hash"),
          "reauth",
          { accountId },
        );
        return apiErrors.internalError("Failed to verify password");
      }
      const passwordOk = await verifyPassword({
        hash: credentialAccount.password,
        password: parsed.data.currentPassword,
      });
      if (!passwordOk) {
        auditAccountDeletion("blocked.bad-password", { accountId });
        return apiErrors.unauthorized("Current password is incorrect");
      }
    }

    auditAccountDeletion("started", {
      accountId,
      email: user.email,
      hasCustomer: Boolean(user.customerId ?? user.subscription?.customerId),
    });

    // Billing FIRST and fail-closed: revoke live subscriptions, then delete
    // the customer. Any failure aborts with 502 BEFORE touching user data.
    const customerId = user.customerId ?? user.subscription?.customerId ?? null;
    if (customerId || user.subscription?.subscriptionId) {
      try {
        await revokePolarSubscriptions(customerId, [
          user.subscription?.subscriptionId,
        ]);
        if (customerId) {
          await deletePolarCustomer(customerId);
        }
      } catch (error) {
        captureRouteError(error, "billing-cleanup", {
          accountId,
          customerId,
        });
        auditAccountDeletion("failed.billing", { accountId, customerId });
        return apiErrors.badGateway(
          "Could not cancel billing. Your account was NOT deleted — please try again or contact support.",
        );
      }
    }

    // Collect external-orphan pointers BEFORE the rows disappear.
    const assets = await collectDeletableAssets(accountId);

    // Sign out user (best-effort; Set-Cookie from this call is not returned)
    await signOutUser();

    // Delete user and related data (FK-proof pre-cleanup + cascades)
    await deleteUserAndRelatedData(accountId, assets.ownedWorkspaceIds);

    // Invalidate caches
    await Promise.all([
      invalidateAccountCaches(accountId),
      invalidateSessionPresenceCache(req.headers.get("cookie")),
    ]);

    // External cleanup is best-effort and never blocks the response.
    // (Fire-and-forget would be dropped on some runtimes; await it — the
    // account is already gone, slowness here only delays this response.)
    await cleanupExternalAssets(accountId, assets).catch((error) =>
      captureRouteError(error, "external-cleanup", { accountId }),
    );

    auditAccountDeletion("completed", {
      accountId,
      workspaces: assets.ownedWorkspaceIds.length,
      links: assets.links.length,
      files: assets.fileKeys.length,
      domains: assets.customDomains,
    });

    // Clear all cookies for this request host + root domain fallback.
    return apiSuccess(
      null,
      "Account deleted successfully",
      200,
      buildCookieClearHeaders(req),
    );
  } catch (error) {
    captureRouteError(error, "delete-handler", { accountId });

    if (error instanceof Error) {
      // Handle cascade delete errors
      if (isNotFoundError(error)) {
        const isDeleted = await verifyUserDeleted(accountId);
        if (isDeleted) {
          await invalidateSessionPresenceCache(req.headers.get("cookie"));
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

    // A foreign/not-owned default workspace is rejected BEFORE the
    // transaction (previously P2025 → generic 500).
    if (validatedData.defaultWorkspaceId) {
      const owned = await db.workspace.findFirst({
        where: { id: validatedData.defaultWorkspaceId, userId: accountId },
        select: { id: true },
      });
      if (!owned) {
        return apiErrors.notFound("Workspace not found");
      }
    }

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
    captureRouteError(error, "update-handler", { accountId });

    if (error instanceof z.ZodError) {
      return apiErrors.validationError(error.errors, "Invalid input data");
    }

    return apiErrors.internalError("Failed to update account");
  }
}
