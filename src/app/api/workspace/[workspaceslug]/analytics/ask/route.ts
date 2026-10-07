import { type NextRequest } from "next/server";
import { z } from "zod";
import { apiErrors, apiSuccess } from "@/lib/api-response";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { getWorkspaceOwnerPlanType } from "@/lib/subscription/entitlements";
import {
  ASK_AI_SYSTEM_INSTRUCTION,
  buildAskAiUserInput,
  sanitizeAskAiResult,
} from "@/lib/ai/analytics-ask-prompt";
import { groqChatJson, isGroqConfigured } from "@/lib/ai/groq";
import {
  AiQuotaUnavailableError,
  consumeAiQuota,
  getAiQuota,
} from "@/lib/ai/analytics-quota";

export const dynamic = "force-dynamic";

const askSchema = z.object({
  question: z.string().trim().min(3).max(300),
  timePeriod: z.enum(["24h", "7d", "30d", "3m", "12m", "all"]).optional(),
  currentFilters: z.record(z.string(), z.string()).optional(),
  availableOptions: z
    .record(z.string(), z.array(z.string()).max(30))
    .optional(),
});

function quotaHeaders(quota: { limit: number; remaining: number }) {
  return {
    "X-AI-Quota-Limit": String(quota.limit),
    "X-AI-Quota-Remaining": String(quota.remaining),
  };
}

/** GET -> quota status for the Ask-AI button badge. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const { workspaceslug } = await params;
  const access = await requireWorkspaceAccess(workspaceslug);
  if (!access.ok) return access.response;

  const planType = await getWorkspaceOwnerPlanType(access.workspace.id);
  try {
    const quota = await getAiQuota(access.workspace.id, planType);
    return apiSuccess({ quota }, undefined, 200, quotaHeaders(quota));
  } catch {
    return apiErrors.serviceUnavailable("AI quota is temporarily unavailable");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceslug: string }> },
) {
  const { workspaceslug } = await params;
  const access = await requireWorkspaceAccess(workspaceslug);
  if (!access.ok) return access.response;

  if (!isGroqConfigured()) {
    return apiErrors.serviceUnavailable("AI analytics is not configured");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrors.badRequest("Invalid JSON body");
  }

  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrors.validationError(parsed.error.errors, "Invalid parameters");
  }

  const planType = await getWorkspaceOwnerPlanType(access.workspace.id);
  try {
    const { allowed, quota } = await consumeAiQuota(
      access.workspace.id,
      planType,
    );
    if (!allowed) {
      return apiErrors.rateLimitExceeded();
    }

    const result = await groqChatJson<unknown>(
      [
        { role: "system", content: ASK_AI_SYSTEM_INSTRUCTION },
        {
          role: "user",
          content: buildAskAiUserInput(parsed.data.question, {
            timePeriod: parsed.data.timePeriod,
            currentFilters: parsed.data.currentFilters,
            availableOptions: parsed.data.availableOptions,
          }),
        },
      ],
      { temperature: 0.1, maxTokens: 600 },
    );

    const sanitized = sanitizeAskAiResult(result);
    if (!sanitized) {
      return apiErrors.badGateway("AI returned an unusable response");
    }

    return apiSuccess(
      { ...sanitized, quota },
      undefined,
      200,
      quotaHeaders(quota),
    );
  } catch (error) {
    if (error instanceof AiQuotaUnavailableError) {
      return apiErrors.serviceUnavailable(
        "AI quota is temporarily unavailable",
      );
    }
    console.error("[analytics ask-ai] Groq error:", error);
    const message =
      error instanceof Error ? error.message : "AI request failed";
    if (message.includes("rate limited")) {
      return apiErrors.rateLimitExceeded();
    }
    return apiErrors.badGateway("AI analytics temporarily unavailable");
  }
}
