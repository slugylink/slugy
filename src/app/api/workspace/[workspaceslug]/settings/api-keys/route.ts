import { randomBytes } from "crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { apiErrors, apiSuccess } from "@/lib/api-response";
import { db } from "@/server/db";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(64),
});

function generateApiKey() {
  return `slugy_${randomBytes(24).toString("hex")}`;
}

async function getAuthorizedWorkspace(userId: string, workspaceslug: string) {
  return db.workspace.findFirst({
    where: {
      userId,
      slug: workspaceslug,
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    const { workspaceslug } = await params;
    const workspace = await getAuthorizedWorkspace(
      session.user.id,
      workspaceslug,
    );

    if (!workspace) {
      return apiErrors.notFound("Workspace not found");
    }

    const body = await request.json();
    const parsed = createApiKeySchema.safeParse(body);

    if (!parsed.success) {
      return apiErrors.validationError(
        parsed.error.flatten(),
        "Invalid API key payload",
      );
    }

    let key = "";
    let created = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      key = generateApiKey();

      try {
        created = await db.workspaceApiKey.create({
          data: {
            name: parsed.data.name,
            key,
            workspaceId: workspace.id,
            createdBy: session.user.id,
            permissionLevel: "restricted",
            linksPermission: "write",
            domainsPermission: "none",
            workspacesPermission: "none",
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
            lastUsed: true,
            expiresAt: true,
            permissionLevel: true,
            linksPermission: true,
          },
        });
        break;
      } catch (error) {
        const isUniqueError =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002";

        if (!isUniqueError || attempt === 2) {
          throw error;
        }
      }
    }

    if (!created) {
      return apiErrors.internalError("Failed to create API key");
    }

    return apiSuccess(
      {
        apiKey: {
          ...created,
          keyPreview: `${key.slice(0, 10)}...${key.slice(-4)}`,
        },
        secret: key,
      },
      "API key created successfully",
      201,
    );
  } catch (error) {
    console.error("[SETTINGS_API_KEYS_POST]", error);
    return apiErrors.internalError("Failed to create API key");
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    const { workspaceslug } = await params;
    const workspace = await getAuthorizedWorkspace(
      session.user.id,
      workspaceslug,
    );

    if (!workspace) {
      return apiErrors.notFound("Workspace not found");
    }

    const apiKeys = await db.workspaceApiKey.findMany({
      where: {
        workspaceId: workspace.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsed: true,
        expiresAt: true,
        permissionLevel: true,
        linksPermission: true,
        key: true,
      },
    });

    return apiSuccess(
      apiKeys.map((apiKey) => ({
        id: apiKey.id,
        name: apiKey.name,
        keyPreview: `${apiKey.key.slice(0, 10)}...${apiKey.key.slice(-4)}`,
        createdAt: apiKey.createdAt.toISOString(),
        lastUsed: apiKey.lastUsed?.toISOString() ?? null,
        expiresAt: apiKey.expiresAt?.toISOString() ?? null,
        permissionLevel: apiKey.permissionLevel,
        linksPermission: apiKey.linksPermission,
      })),
    );
  } catch (error) {
    console.error("[SETTINGS_API_KEYS_GET]", error);
    return apiErrors.internalError("Failed to fetch API keys");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    const { workspaceslug } = await params;
    const workspace = await getAuthorizedWorkspace(
      session.user.id,
      workspaceslug,
    );

    if (!workspace) {
      return apiErrors.notFound("Workspace not found");
    }

    const { searchParams } = new URL(request.url);
    const apiKeyId = searchParams.get("apiKeyId");

    if (!apiKeyId) {
      return apiErrors.badRequest("apiKeyId is required");
    }

    const existing = await db.workspaceApiKey.findFirst({
      where: {
        id: apiKeyId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return apiErrors.notFound("API key not found");
    }

    await db.workspaceApiKey.delete({
      where: { id: existing.id },
    });

    return apiSuccess(null, "API key deleted successfully");
  } catch (error) {
    console.error("[SETTINGS_API_KEYS_DELETE]", error);
    return apiErrors.internalError("Failed to delete API key");
  }
}
