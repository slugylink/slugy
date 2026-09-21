import { jsonWithETag } from "@/lib/http";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { z } from "zod";
import { headers } from "next/headers";

const optionalParam = z
  .string()
  .trim()
  .max(255)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

const createUtmTemplateSchema = z.object({
  name: z.string().min(1).max(40),
  source: optionalParam,
  medium: optionalParam,
  campaign: optionalParam,
  term: optionalParam,
  content: optionalParam,
  referral: optionalParam,
});

type CreateUtmTemplateSchema = z.infer<typeof createUtmTemplateSchema>;

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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return jsonWithETag(req, { message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CreateUtmTemplateSchema;
    const validatedData = createUtmTemplateSchema.parse(body);

    const context = await params;

    const workspace = await db.workspace.findFirst({
      where: {
        slug: context.workspaceslug,
        OR: [
          { userId: session.user.id },
          {
            members: {
              some: { userId: session.user.id },
            },
          },
        ],
      },
      select: {
        id: true,
        maxUtmTemplates: true,
      },
    });

    if (!workspace) {
      return jsonWithETag(
        req,
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const templateCount = await db.utmTemplate.count({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
      },
    });

    if (
      workspace.maxUtmTemplates != null &&
      templateCount >= workspace.maxUtmTemplates
    ) {
      return jsonWithETag(
        req,
        {
          error: `Maximum number of UTM templates (${workspace.maxUtmTemplates}) reached for this workspace. Upgrade to pro!`,
          code: "UTM_TEMPLATE_LIMIT_REACHED",
        },
        { status: 400 },
      );
    }

    const existingTemplate = await db.utmTemplate.findFirst({
      where: {
        workspaceId: workspace.id,
        name: validatedData.name,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingTemplate) {
      return jsonWithETag(
        req,
        { error: "A template with this name already exists" },
        { status: 400 },
      );
    }

    const template = await db.utmTemplate.create({
      data: {
        name: validatedData.name,
        utm_source: validatedData.source,
        utm_medium: validatedData.medium,
        utm_campaign: validatedData.campaign,
        utm_term: validatedData.term,
        utm_content: validatedData.content,
        referral: validatedData.referral,
        workspaceId: workspace.id,
      },
      select: utmTemplateSelect,
    });

    return jsonWithETag(req, template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithETag(
        req,
        { error: "Invalid request data", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[UTM_TEMPLATES_POST]", error);
    return jsonWithETag(
      req,
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return jsonWithETag(req, { message: "Unauthorized" }, { status: 401 });
    }

    const context = await params;
    const workspace = await db.workspace.findFirst({
      where: {
        slug: context.workspaceslug,
        OR: [
          { userId: session.user.id },
          {
            members: {
              some: { userId: session.user.id },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!workspace) {
      return jsonWithETag(
        req,
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const templates = await db.utmTemplate.findMany({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
      },
      select: utmTemplateSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    return jsonWithETag(req, templates);
  } catch (error) {
    console.error("[UTM_TEMPLATES_GET]", error);
    return jsonWithETag(
      req,
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
