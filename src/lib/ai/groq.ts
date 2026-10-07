/** Minimal Groq (OpenAI-compatible) chat client for analytics Ask AI. */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export function getGroqConfig() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  // Available text models vary per Groq account (see console.groq.com).
  // GPT-OSS 20B is widely available and plenty for filter-mapping JSON.
  const configured = process.env.GROQ_ANALYTICS_MODEL?.trim();
  const models = Array.from(
    new Set(
      [configured, "openai/gpt-oss-20b", "openai/gpt-oss-120b"].filter(
        Boolean,
      ) as string[],
    ),
  );
  return { apiKey, model: models[0]!, models };
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export async function groqChatJson<T>(
  messages: GroqChatMessage[],
  options: GroqChatOptions = {},
): Promise<T> {
  const { apiKey, models } = getGroqConfig();
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  let lastError = "";
  for (const model of models) {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 600,
        response_format: { type: "json_object" },
      }),
    });

    if (res.ok) {
      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Empty AI response");
      return JSON.parse(content) as T;
    }

    const text = await res.text().catch(() => "");
    lastError = text.slice(0, 200);
    // Model removed / not entitled on this account -> try next model.
    if (
      res.status === 404 ||
      (res.status === 400 && lastError.includes("model_not_found"))
    ) {
      console.warn(`[groq] model ${model} unavailable, trying fallback`);
      continue;
    }
    if (res.status === 429) throw new Error("AI rate limited, try again soon");
    throw new Error(`Groq request failed (${res.status}): ${lastError}`);
  }

  throw new Error(`No available Groq model (${lastError})`);
}
