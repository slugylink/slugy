/** Model instructions. Never concatenate untrusted input into this string —
 * user-controlled URL data belongs in the user-role message built by
 * buildGeminiUserInput. */
export const SLUG_SYSTEM_INSTRUCTION =
  "Generate ONE SEO-friendly URL slug (2-5 words, 3-20 characters total, lowercase letters, numbers, and hyphens only). Return ONLY the slug text. No quotes, labels, or explanation.";

/** Untrusted URL data, kept as data in the user-role message (never instructions). */
export function buildGeminiUserInput(
  url: string,
  intent: string,
  pathHint?: string | null,
): string {
  const hintLine = pathHint
    ? `\nPreferred title from the URL path: ${pathHint}\nUse this as the basis for the slug when it is a real product/page name.`
    : "";
  return `URL: ${url}\nPage intent: ${intent}\n${hintLine}`;
}

export function buildGeminiPrompt(
  url: string,
  intent: string,
  pathHint?: string | null,
): string {
  const hintLine = pathHint
    ? `\nPreferred title from the URL path: ${pathHint}\nUse this as the basis for the slug when it is a real product/page name.`
    : "";

  return `Generate ONE SEO-friendly URL slug for this page.

URL: ${url}
Page intent: ${intent}
${hintLine}

Rules:
- Prefer the human-readable product or page title from the path
- Ignore tracking junk: ref=, ASINs (B0...), /dp/, query params, affiliate tags
- 2 to 5 words
- 3 to 20 characters total
- lowercase letters, numbers, and hyphens only
- no leading/trailing hyphen, no spaces
- descriptive and human-readable
- do not include the domain TLD (com, in, io, etc.)

Examples:
- https://www.amazon.in/Sonata-Analog-Quartz-White-Watch/dp/B0DTZ6H1NV → sonata-white-watch
- https://example.com/blog/react-auth-guide → react-auth-guide
- https://example.com/pricing → pricing-plans

Return ONLY the slug text. No quotes, labels, or explanation.`;
}
