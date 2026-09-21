import { jsonWithETag } from "@/lib/http";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";
import { headers } from "next/headers";
import { getWorkspaceAccess, hasRole } from "@/lib/workspace-access";

const optionalParam = z
  .string()
  .trim()
  .max(255)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

const updateUtmTemplateSchema = z.object({
  name: z.string().min(1).max(40),
  source: optionalParam,
  medium: optionalParam,
  campaign: optionalParam,
  term: optionalParam,
  content: optionalParam,
  referral: optionalParam,
});

type UpdateUtmTemplateRequest = z.infer<typeof updateUtmTemplateSchema>;

const utmTemplateSelect = {
  id: true,
  name: true,
  utm_source: true,
  utm_medium: true,
  utm_campaign: true,
  utm_term: true,
  utm_content: true,
  referral: true,
  isDefault: true,
  createdAt: true,
} as const;

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ workspaceslug: string; utmTemplateId: string }>;
  },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return jsonWithETag(req, { message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    const access = await getWorkspaceAccess(
      session.user.id,
      context.workspaceslug,
    );
    if (!access.success || !access.workspace || !hasRole(access.role, "member"))
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    const existingTemplate = await db.utmTemplate.findFirst({
      where: {
        id: context.utmTemplateId,
        workspaceId: access.workspace.id,
        deletedAt: null,
      },
    });

    if (!existingTemplate) {
      return jsonWithETag(
        req,
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const body = (await req.json()) as UpdateUtmTemplateRequest;
    const validatedData = updateUtmTemplateSchema.parse(body);

    if (validatedData.name !== existingTemplate.name) {
      const existingTemplateWithName = await db.utmTemplate.findFirst({
        where: {
          workspaceId: access.workspace.id,
          name: validatedData.name,
          deletedAt: null,
        },
      });

      if (existingTemplateWithName) {
        return jsonWithETag(
          req,
          { error: "A template with this name already exists" },
          { status: 400 },
        );
      }
    }

    await db.utmTemplate.updateMany({
      where: {
        id: context.utmTemplateId,
        workspaceId: access.workspace.id,
      },
      data: {
        name: validatedData.name,
        utm_source: validatedData.source,
        utm_medium: validatedData.medium,
        utm_campaign: validatedData.campaign,
        utm_term: validatedData.term,
        utm_content: validatedData.content,
        referral: validatedData.referral,
      },
    });

    const updatedTemplate = await db.utmTemplate.findFirst({
      where: {
        id: context.utmTemplateId,
        workspaceId: access.workspace.id,
      },
      select: utmTemplateSelect,
    });

    if (!updatedTemplate) {
      return jsonWithETag(
        req,
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return jsonWithETag(req, updatedTemplate, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithETag(
        req,
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }

    console.error("[UTM_TEMPLATE_UPDATE]", error);
    return jsonWithETag(
      req,
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ workspaceslug: string; utmTemplateId: string }>;
  },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return jsonWithETag(req, { message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;

    const access = await getWorkspaceAccess(
      session.user.id,
      context.workspaceslug,
    );
    if (!access.success || !access.workspace || !hasRole(access.role, "member"))
      return jsonWithETag(req, { error: "Unauthorized" }, { status: 401 });

    const template = await db.utmTemplate.findFirst({
      where: {
        id: context.utmTemplateId,
        workspaceId: access.workspace.id,
        deletedAt: null,
      },
    });

    if (!template) {
      return jsonWithETag(
        req,
        { error: "Template not found" },
        { status: 404 },
      );
    }

    await db.utmTemplate.updateMany({
      where: {
        id: context.utmTemplateId,
        workspaceId: access.workspace.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return jsonWithETag(
      req,
      { message: "Template deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[UTM_TEMPLATE_DELETE]", error);
    return jsonWithETag(
      req,
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
