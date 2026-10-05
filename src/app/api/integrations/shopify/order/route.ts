import { z } from "zod";
import { apiErrors, apiSuccess } from "@/lib/api-response";
import { authenticateApiKey } from "@/lib/api-keys/auth";
import { checkLeadTrackRateLimit } from "@/lib/middleware/rate-limit";
import { extractClickId, recordIntegrationSale } from "@/lib/leads/record-sale";

const shopifySchema = z.object({
  clickId: z.string().min(1).optional(),
  orderId: z.union([z.string(), z.number()]).optional(),
  customerExternalId: z.string().min(1).max(255).optional(),
  customerEmail: z.string().email().optional().nullable(),
  customerName: z.string().max(255).optional().nullable(),
  saleAmount: z.number().positive().max(1000000000),
  saleCurrency: z.string().min(3).max(3).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

/**
 * Shopify order attribution: web pixel / Flow connector POSTs here with the
 * `slugy_click_id` captured at checkout.
 *
 * Authentication is mandatory: either the shared-webhook HMAC (when
 * SHOPIFY_WEBHOOK_SECRET is set) or a workspace API key with leads:write,
 * which additionally binds the sale to the key's workspace. Plan gates
 * (Pro+ for leads, Growth for sales) are enforced inside recordIntegrationSale.
 */
export async function POST(req: Request) {
  const rawText = await req.text().catch(() => "");
  let apiKeyWorkspaceId: string | undefined;

  if (process.env.SHOPIFY_WEBHOOK_SECRET) {
    const { createHmac, timingSafeEqual } = await import("crypto");
    const given = req.headers.get("x-shopify-hmac-sha256") ?? "";
    const expected = createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET)
      .update(rawText, "utf8")
      .digest("base64");
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return apiErrors.forbidden("Invalid Shopify signature");
    }
  } else {
    const auth = await authenticateApiKey(
      req.headers.get("authorization"),
      "write",
      "leads",
    );
    if (!auth.ok) {
      return apiErrors[auth.status === 401 ? "unauthorized" : "forbidden"](
        auth.message,
      );
    }
    const leadLimit = await checkLeadTrackRateLimit(auth.apiKey.id);
    if (!leadLimit.success) {
      return apiErrors.rateLimitExceeded(
        Math.max(1, Math.ceil((leadLimit.reset - Date.now()) / 1000)),
      );
    }
    apiKeyWorkspaceId = auth.apiKey.workspaceId;
  }

  let body: unknown;
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    return apiErrors.badRequest("Invalid JSON body");
  }
  const parsed = shopifySchema.safeParse(body);
  if (!parsed.success) return apiErrors.validationError(parsed.error.flatten());

  const d = parsed.data;
  const clickId =
    d.clickId ??
    extractClickId(d.metadata as Record<string, unknown> | undefined) ??
    "";
  if (!clickId) return apiErrors.badRequest("Missing clickId (slugy_click_id)");

  const result = await recordIntegrationSale(
    {
      clickId,
      customerExternalId:
        d.customerExternalId ??
        d.customerEmail ??
        `shopify-${String(d.orderId ?? clickId)}`,
      customerEmail: d.customerEmail ?? null,
      customerName: d.customerName ?? null,
      saleAmount: d.saleAmount,
      saleCurrency: d.saleCurrency ?? null,
      source: "shopify",
      sourceId: d.orderId != null ? String(d.orderId) : null,
    },
    apiKeyWorkspaceId ? { expectedWorkspaceId: apiKeyWorkspaceId } : undefined,
  );
  if (!result.ok) {
    return result.status === 403
      ? apiErrors.forbidden(result.message)
      : apiErrors.notFound(result.message);
  }
  return apiSuccess(
    { leadEventId: result.leadEventId, idempotent: result.idempotent },
    result.idempotent ? "Sale already recorded" : "Sale recorded",
    result.idempotent ? 200 : 201,
  );
}
