# Contributing to Slugy

Thanks for considering a contribution. Slugy is an open-source URL shortener
and link-analytics platform (Next.js 16, TypeScript, Prisma, Neon Postgres,
Upstash Redis).

## Good first issues

Look for issues labeled `good first issue` — each has reproducible steps and
acceptance criteria. If an issue lacks them, ask in the issue before starting.

## Workflow

1. Fork the repo and create a branch: `git checkout -b feat/my-change`.
2. For large changes, open an issue first so we can agree on the approach.
3. Make your changes with Prettier / ESLint passing:
   ```bash
   npm run lint
   npx tsc --noEmit -p tsconfig.json
   ```
4. Commit, push, and open a pull request against `main`.
5. Link any related issue and describe how you tested the change.

## What makes a good PR

- **One concern per PR.** Refactors ride along only when required by the fix.
- **No fabricated claims.** Comparison pages, pricing figures, and benchmark
  numbers must cite a live source with a checked date (see
  `src/app/(root)/_components/compare-table.tsx` for the pattern).
- **True HTTP statuses.** Unknown slugs must 404, never render homepage
  content with a 200. Verify with:
  ```bash
  curl -s -o /dev/null -w '%{http_code} %{url_effective}\n' \
    http://localhost:3000/nonexistent-seo-test-12345
  ```
- **Noindex stays noindex.** Password gates, `/expired`, `/custom-domain`
  infra routes, and app/admin surfaces must never become crawlable.
- **Screenshots for UI changes.** UI PRs should attach before/after
  screenshots; see `docs/screenshots.md` for the required captures.

## Product feedback and deployment Q&A

Use [GitHub Discussions](https://github.com/slugylink/slugy/discussions)
for questions, self-hosting help, and feature ideas — not issues.

## Code of conduct

Be kind and direct. Objective technical feedback over validation; disagree
when the evidence warrants it. Harassment or spam gets blocked.
