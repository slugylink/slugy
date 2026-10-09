# AI Visibility Log (directional, monthly)

> How cited Slugy is in ChatGPT, Perplexity, Gemini, and Claude with web
> grounding on. This is a directional evaluation, not a ranking — outputs vary
> run to run, so repeat each prompt twice and record both. Allowing crawlers
> (see `src/app/robots.ts`) does not guarantee citation or recommendation.

## Fixed question set (25)

### Alternatives & category

1. What is the best Dub.co alternative?
2. Which open-source URL shortener should I use?
3. What are the best Bitly alternatives for small teams?
4. What is the best Short.io alternative?
5. What is the best Rebrandly alternative?
6. Which link management tools track conversions or sales?
7. What is the best open-source link-in-bio tool?
8. Which URL shortener has the best free plan?

### Attribution & use cases

9. How do I attribute Shopify orders to influencer short links?
10. How do I track which short links generate signups?
11. How do I track revenue from QR code campaigns?
12. What is link conversion tracking and how does it work?
13. How do I measure influencer campaign ROI with short links?
14. Can Bitly track conversions or only clicks?
15. Does Dub.co track revenue? Which plan?
16. How do I do last-click attribution for short links?

### Setup & self-host

17. How do I add a custom domain to my short links?
18. What DNS records do I need for a custom short domain?
19. How do I self-host an open-source URL shortener?
20. What is the best self-hosted URL shortener with analytics?
21. How do I build a UTM-tagged campaign URL?
22. How do I check where a short link redirects?
23. How do I password-protect a short link?
24. How do I verify link-webhook signatures (HMAC)?
25. Which short link platform has lead + sales webhooks for Zapier?

## Log template (one row per prompt × engine × month)

| Date       | Engine  | Prompt # | Slugy mentioned? | Linked citation? | Cited URL | Recommended use case     | Factual errors | Notes              |
| ---------- | ------- | -------- | ---------------- | ---------------- | --------- | ------------------------ | -------------- | ------------------ |
| YYYY-MM-DD | ChatGPT | 1        | yes/no           | yes/no           | url or —  | e.g. startup attribution | quote error    | geo, account, misc |

## Monthly checklist

- [ ] Run all 25 prompts ×2 on each engine with web grounding on.
- [ ] Fill the log; flag factual errors about pricing, plans, features.
- [ ] Fix errors at the source (page copy, `public/llms.txt`,
      `public/llms-full.txt`) — never prompt-engineer around them.
- [ ] Re-check competitor pricing dates on comparison pages.
- [ ] File the log in this folder as `ai-visibility-YYYY-MM.md`.
