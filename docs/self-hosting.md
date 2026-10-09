# Self-Hosting Slugy: Requirements & Setup

> Status: community-supported. The production service at slugy.co runs on
> managed infrastructure (Neon Postgres, Upstash Redis, Tinybird, Resend,
> Polar, Cloudflare R2, Vercel). A self-hosted instance can run the core
> link-management flow with fewer services, but some features degrade
> gracefully or require extra accounts. This page states exactly what is
> mandatory and what is optional.

## What works with minimum setup

- Branded short links, custom slugs, expiration, password protection
- Custom-domain redirects (with your own DNS + TLS termination)
- Basic click redirects and dashboard

## Mandatory

| Requirement                                                           | Why                                              | Notes                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Node.js 20+                                                           | Next.js 16 runtime                               | See `package.json` engines                                                              |
| Postgres 17+ (or Neon)                                                | Primary store: links, workspaces, users          | `docker-compose.yml` gives you local Postgres + a Neon-compatible proxy for development |
| `DATABASE_URL`                                                        | Prisma connection string                         | Format in `.env.example`                                                                |
| `BETTER_AUTH_SECRET`                                                  | Session/auth signing                             | Any 32+ char random string                                                              |
| Upstash Redis (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) | Link cache, rate limits, analytics batching      | Without it, redirects hit Postgres on every click and rate limiting is disabled         |
| `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_APP_URL`                      | Routing between marketing site and app subdomain | `localhost:3000` / `app.localhost:3000` for local dev                                   |

## Optional (feature degrades without it)

| Service                                          | Unlocks                                     | Without it                                                      |
| ------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------- |
| Tinybird (`TINYBIRD_TOKEN`)                      | Realtime click-event analytics pipeline     | Dashboard falls back to Postgres counters; funnels slower       |
| Resend (`RESEND_API_KEY`, `EMAIL_FROM`)          | Transactional email (verification, invites) | Email flows fail; use direct DB user creation for local testing |
| Polar (`POLAR_ACCESS_TOKEN`, price IDs)          | Subscriptions, Pro/Growth gates             | All workspaces behave as free; lead/revenue tracking gated off  |
| Cloudflare R2                                    | Avatar/OG-image storage                     | Uploads fail; links still work                                  |
| Vercel (`VERCEL_TOKEN`, `VERCEL_PROJECT_ID`)     | Automatic custom-domain provisioning        | Add DNS/TLS manually per domain                                 |
| Inngest / QStash                                 | Background jobs, cron backfills             | Scheduled aggregation doesn't run                               |
| Sentry                                           | Error monitoring                            | Logs only                                                       |
| Gemini / Groq (`GEMINI_API_KEY`, `GROQ_API_KEY`) | AI slug suggestions, analytics Ask AI       | Features hidden or return errors                                |

## Quickstart (local evaluation)

```bash
git clone https://github.com/slugylink/slugy.git
cd slugy
npm install
docker compose up -d        # local Postgres + Neon proxy ONLY
cp .env.example .env.local   # fill in DATABASE_URL, BETTER_AUTH_SECRET, Redis
npx prisma generate
npm run db:push
npm run dev
```

Open `http://localhost:3000` (marketing) and `http://app.localhost:3000`
(app). If `app.localhost` doesn't resolve, add `127.0.0.1 app.localhost` to
your hosts file.

## What `docker-compose.yml` does NOT do

- It does not build or run the Next.js app.
- It does not provision Redis, Tinybird, Resend, Polar, R2, or Vercel.
- It is not hardened for production (default `postgres/postgres` password,
  no TLS, no backups, no persistence guarantees beyond the `db_data` volume).

## Production self-host checklist (not officially supported)

1. Managed Postgres (Neon or equivalent) with PITR backups.
2. Managed Redis (Upstash) with TLS.
3. TLS termination + wildcard certs for custom domains.
4. `CRON_SECRET` set; `/api/cron/*` on a scheduler.
5. `LINK_PASSWORD_COOKIE_SECRET` (or accept fallback to `BETTER_AUTH_SECRET`).
6. OAuth clients (GitHub/Google) with production callback URLs.
7. Separate `POLAR_MODE=production` with live price IDs.

## Support boundaries

- GitHub Issues: bug reports with reproduction steps welcome.
- No SLA for self-hosted instances; production debugging requires the
  managed-service logs listed above.
- Security reports: open a GitHub security advisory, never a public issue.

## Verify your install

1. Create a short link in the app.
2. Open it in an incognito window — expect a 302 to the destination.
3. Open a bogus slug (e.g. `/selfhost-test-404-abc`) — expect a true 404 page,
   not the homepage.
4. Check `/api/health` (if configured) or the Prisma Studio row for the click.
