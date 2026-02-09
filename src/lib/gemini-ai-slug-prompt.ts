function buildGeminiPrompt(url: string, intent: string): string {
  return `
Generate ONE short, meaningful, SEO-friendly URL slug.

URL:
${url}

Page intent: ${intent}

Rules:
- 2 to 4 words max
- 5 to 25 characters total
- lowercase only
- letters, numbers, hyphens only
- no trailing hyphen
- human-readable and descriptive

Examples:
- react-auth-guide
- pricing-plans
- github-discussions

Return ONLY the slug.
`;
}

export { buildGeminiPrompt };
