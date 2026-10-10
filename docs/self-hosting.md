# Self-Hosting Slugy: Requirements & Setup

## L3 campaign attribution rollout

The workspace sidebar includes Campaigns (Pro+); revenue, costs, and public
campaign reports require Growth/Premium under the existing entitlement rules.
No billing prices or L4 partner/payout behavior change in this release.

Deploy in this order:

1. Back up Postgres and apply `npm run db:migrate` to staging first. Migration
   `20261010000000_campaign_attribution` creates campaigns, seven traffic sources,
   decimal spend rows, click quality fields, and campaign attribution. It backfills
   campaign membership from exact, nonblank `Link.utm_campaign` names per workspace.
   Historical events inherit their link's campaign at migration time; historical
   reassignment cannot be reconstructed. Review the updates against production
   data volume before deploying (the analytics backfill may lock/write many rows).
2. Deploy the Tinybird definitions in `src/lib/tinybird/could/tinybird.ts` using
   your existing Tinybird deployment workflow **before deploying application code**.
   The raw click datasource gains `campaign_id`, `quality_score`, `is_bot`, and
   `is_duplicate`; `campaign_clicks` is the new read endpoint. Allow its execution
   in the server Tinybird token. The existing click projection filters bots and
   duplicates so ordinary click analytics retain their previous meaning. Legacy
   `.datasource`/`.pipe` equivalents are in `src/scripts/tinybird`.
3. Generate Prisma (`npx prisma generate`), build, and deploy the application.
   Old redirect cache entries without `campaignId` are refreshed automatically.
4. Sync `/api/inngest` so `campaign-health-alerts` runs every two minutes.
   Keep the existing authenticated analytics batch cron running; quality reports
   and bot alerts reflect its processing delay. Configure `RESEND_API_KEY` and
   `EMAIL_FROM` for email; without them alerts are still stored as notifications.

Campaign link assignment affects future clicks. The campaign captured on each
click is copied to lead/sale events; moving links does not move past conversions.
Existing short links still need conversion tracking enabled to forward `slugy_id`.
Revenue uses existing lead/sale writers and their existing conversion dedupe rule.

Reports show all-time clicks, unique customers with non-sale lead events, sales,
and separate revenue/spend/ROAS/CPA per currency. Zero denominators display a dash;
unknown revenue currency is never assumed to be USD. Costs use decimal storage;
there is no FX conversion. Tinybird totals are used when available and at least as
complete as the Postgres copy; otherwise the report identifies its Postgres fallback.
Pre-migration raw Tinybird clicks have no campaign ID, while Postgres has the UTM
backfill. The converting device/browser/country breakdown and match rate use
Postgres clicks joined by click ID, so allow the batch to catch up before judging
match coverage. Quality only counts newly scored events; older clicks are unknown.

Cost API: `POST /api/campaigns/:id/costs` with a Bearer workspace API key that has
links write permission. JSON accepts one row or up to 1,000 rows; `text/csv` accepts
the same columns. The dashboard uses the equivalent workspace-scoped endpoint.
Imports upsert by campaign/date/currency/source, replacing spend on repeat imports.
The complete import is validated and written transactionally. Example CSV:

```csv
date,spend,currency,source
2026-10-10,50.00,USD,google
```

Share links use revocable random tokens. Revenue and cost visibility default off;
public pages expose aggregates, never customer IDs, click IDs, or individual costs.
An expired Growth entitlement makes the public report unavailable.

Traffic quality scores bots as 0, duplicate click ID/IP/UA tuples within 30 seconds
as 25, and other traffic as 100. A failed quality check is unscored. Redirects still
generate a new click ID per visit; this exact-tuple rule detects replayed events,
not repeat visits with different click IDs. Bot previews are recorded for quality
but excluded from normal click counters and the Tinybird click projection.

Alerts check active, opted-in campaigns: over 20% bots in the trailing hour,
conversion changes over two standard deviations using the last completed UTC day
against the previous seven completed days, and non-2xx destination HEAD responses.
Conversion alerts require at least seven baseline conversions and a change greater
than two events. Destination checks follow at most three redirects, pin DNS to
validated public addresses, and time out each request after eight seconds. Servers
that reject HEAD may report a failure even if GET works. Alerts are throttled for
one hour per campaign/signal. Email latency depends on Inngest queue and mail delivery;
the under-five-minute delivery target must be measured on staging.

Validation before production:

- Run `node --test scripts/test-campaigns.cjs`, `npx prisma validate`, lint, and build.
- In a Growth test workspace create a campaign, assign five conversion-enabled
  links, click, record ten lead/sale events, and import the sample cost CSV. Verify
  ROAS equals revenue divided by 50 and CPA equals 50 divided by unique leads.
- Export spend and import it twice: row count and totals must remain unchanged.
- Verify click-ID join coverage exceeds 95% after the batch runs, simulate a bot
  burst, and check the campaign quality percentages and notification/email.
- Verify cross-workspace API keys cannot import costs or attach foreign links,
  and revoking a share link removes public access.

These live checks require deployed Postgres/Tinybird/Inngest/Resend services; the
local tests use isolated fixtures and do not write to those services.

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
