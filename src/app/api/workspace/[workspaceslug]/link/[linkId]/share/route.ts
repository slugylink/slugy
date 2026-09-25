import { db } from "@/server/db";
import { auth } from "@/lib/auth";
import { jsonWithETag } from "@/lib/http";
import { headers } from "next/headers";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { getWorkspaceAccess, hasRole } from "@/lib/workspace-access";
import {
  hashLinkPassword,
  isPasswordUnchanged,
  maskLinkPassword,
} from "@/lib/link-password";

const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  12,
);

const shareSettingsSchema = z.object({
  isPublic: z.boolean(),
  allowIndexing: z.boolean().optional().default(false),
  password: z.string().max(72).nullable().optional(),
  showLeads: z.boolean().optional().default(false),
});

async function getLinkInWorkspace(linkId: string, workspaceId: string) {
  return db.link.findFirst({
    where: { id: linkId, workspaceId, deletedAt: null },
    select: { id: true },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; linkId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    const access = await getWorkspaceAccess(
      session.user.id,
      context.workspaceslug,
    );
    if (!access.success || !access.workspace || !hasRole(access.role, "member"))
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    const link = await getLinkInWorkspace(context.linkId, access.workspace.id);
    if (!link) {
      return jsonWithETag(req, { error: "Link not found" }, { status: 404 });
    }

    const shared = await db.sharedAnalytics.findUnique({
      where: { linkId: link.id },
    });

    return jsonWithETag(
      req,
      {
        isPublic: shared?.isPublic ?? false,
        allowIndexing: shared?.allowIndexing ?? false,
        // Never leak the hash — the modal treats the mask as "unchanged".
        password: maskLinkPassword(shared?.password),
        publicId: shared?.publicId ?? null,
        showLeads: shared?.showLeads ?? false,
      },
      {
        status: 200,
        // Cacheable + revalidatable: dialog reopens come from the browser
        // cache or a cheap 304 instead of a fresh DB read every time.
        headers: { "Cache-Control": "private, max-age=60, must-revalidate" },
      },
    );
  } catch (error) {
    console.error("Error fetching share settings:", error);
    return jsonWithETag(
      req,
      { message: "An error occurred while fetching share settings." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string; linkId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    const access = await getWorkspaceAccess(
      session.user.id,
      context.workspaceslug,
    );
    if (!access.success || !access.workspace || !hasRole(access.role, "member"))
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    const link = await getLinkInWorkspace(context.linkId, access.workspace.id);
    if (!link) {
      return jsonWithETag(req, { error: "Link not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = shareSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithETag(
        req,
        { message: "Invalid input data", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { isPublic, allowIndexing, showLeads } = parsed.data;
    let password = parsed.data.password ?? null;
    if (password !== null && password.length > 0 && password.length < 4) {
      return jsonWithETag(
        req,
        { message: "Password must be at least 4 characters" },
        { status: 400 },
      );
    }

    const existing = await db.sharedAnalytics.findUnique({
      where: { linkId: link.id },
    });

    let storedPassword: string | null;
    if (password === null || password === "") {
      storedPassword = null;
    } else if (isPasswordUnchanged(password) && existing?.password) {
      storedPassword = existing.password;
    } else {
      storedPassword = hashLinkPassword(password);
    }

    const shared = existing
      ? await db.sharedAnalytics.update({
          where: { linkId: link.id },
          data: {
            isPublic,
            // Only public reports can be indexed; private ones never are.
            allowIndexing: isPublic && allowIndexing,
            password: storedPassword,
            showLeads,
            deletedAt: null,
          },
        })
      : await db.sharedAnalytics.create({
          data: {
            linkId: link.id,
            publicId: nanoid(),
            isPublic,
            allowIndexing: isPublic && allowIndexing,
            password: storedPassword,
            showLeads,
          },
        });

    return jsonWithETag(
      req,
      {
        isPublic: shared.isPublic,
        allowIndexing: shared.allowIndexing,
        password: maskLinkPassword(shared.password),
        publicId: shared.publicId,
        showLeads: shared.showLeads,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving share settings:", error);
    if (error instanceof z.ZodError) {
      return jsonWithETag(
        req,
        { message: "Invalid input data", errors: error.errors },
        { status: 400 },
      );
    }
    return jsonWithETag(
      req,
      { message: "An error occurred while saving share settings." },
      { status: 500 },
    );
  }
}
