# Screenshots & Product Evidence Checklist

> No fabricated benchmarks, mockups presented as product, or stock dashboards.
> Every capture below must come from a real running instance. Record the
> commit SHA and date with each batch.

## Required captures (light + dark where applicable)

1. **Short-link creation** — app dashboard, new link dialog with custom slug.
2. **Clicks / leads / revenue dashboard** — analytics view showing per-link
   clicks, conversion rate, and revenue (seeded demo workspace is fine; label
   it as demo data if published).
3. **QR code generation** — QR for a branded link + PNG/SVG export UI.
4. **Custom-domain setup** — DNS instructions screen + verified domain state.
5. **Password gate** — what a visitor sees on a protected link.
6. **Expired link page** — `/expired` rendering for an expired slug.
7. **True 404** — unknown slug rendering the not-found page (with visible URL).
8. **UTM builder** — filled campaign URL + copy action.
9. **Shopify attribution** — order payload POST + revenue attributed per link
   (see `/integrations/shopify`).

## Specs

- Viewport 1440×900 minimum; hide bookmarks bar and personal data.
- PNG for UI, max 300 KB (compress; use `public/images/` naming
  `feature-<name>.png`).
- Alt text must describe the content, not market it
  (e.g. `alt="Slugy analytics dashboard showing clicks and revenue per link"`).
- Reference from README "See Slugy in Action" and the relevant feature page
  once merged — never commit `TODO-image` placeholders to `main`.

## Where screenshots surface

- README first screen (2 images max: creation + analytics).
- GitHub About / social preview (`public/og-square.png` source).
- `/features/conversion-tracking` setup + reporting sections.
- OpenAlternative / AlternativeTo listings (same assets, same dates).
