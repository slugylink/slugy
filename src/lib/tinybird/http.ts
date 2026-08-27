/**
 * Edge-safe Tinybird Events API helpers.
 * Prefer these from middleware/edge; use the typed SDK client in Node routes.
 */

export function getTinybirdConfig() {
  const token = process.env.TINYBIRD_TOKEN ?? process.env.TINYBIRD_API_KEY;
  const baseUrl = (
    process.env.TINYBIRD_URL ?? "https://api.us-east.aws.tinybird.co"
  ).replace(/\/$/, "");

  return { token, baseUrl };
}

export async function ingestTinybirdEvent(
  datasource: string,
  payload: Record<string, unknown>,
  options?: { wait?: boolean; timeoutMs?: number },
): Promise<void> {
  const { token, baseUrl } = getTinybirdConfig();
  if (!token) {
    console.error("[Tinybird] Missing TINYBIRD_TOKEN / TINYBIRD_API_KEY");
    return;
  }

  const wait = options?.wait ?? true;
  const timeoutMs = options?.timeoutMs ?? 5000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `${baseUrl}/v0/events?name=${encodeURIComponent(datasource)}&wait=${wait}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Tinybird] ${datasource} error:`, res.status, text);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new Error(
        `Tinybird request timeout after ${timeoutMs}ms`,
      );
      timeoutError.name = "TinybirdTimeoutError";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
