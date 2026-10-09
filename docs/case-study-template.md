# Case Study Template (permission-based only)

> Do not publish without written permission from the customer. No composite
> characters, no invented metrics, no anonymized "a boutique store" figures
> presented as real results. Fictional illustrations stay on marketing pages
> and are labeled as examples.

## Pre-publish checklist

- [ ] Written permission (email is fine) covering company name, logo, metrics.
- [ ] Metrics pulled from the customer's actual workspace (link IDs on file).
- [ ] Customer reviewed the draft and approved quotes verbatim.
- [ ] Date of measurement window stated (e.g. "12–26 Sep 2026").
- [ ] Limitations noted (attribution model, sample size, seasonality).

## Structure

1. **Who** — company, size, channels (1 paragraph).
2. **Problem** — what click-only analytics couldn't answer (with the old
   numbers, if shareable).
3. **Setup** — links created, click-ID capture, lead/sale events (link the
   Shopify guide + conversion-tracking page).
4. **Results** — per-link clicks → leads → revenue table (real numbers only).
5. **Quote** — one verbatim customer sentence.
6. **CTA** — "Replicate this setup" → `/features/conversion-tracking`.

## File location

Publish at `src/content/blogs/posts/case-study-<slug>.tsx` following the
existing post component pattern, register in `src/content/blogs/index.ts`,
and add to the sitemap automatically via `getAllPosts()`.
