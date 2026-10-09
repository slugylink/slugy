<div align="center">

![Slugy Banner](https://ik.imagekit.io/xriiap5ue/Slugy%20-%20Short%20links%20with%20powerful%20analytics.png)

# Slugy — Open-Source URL Shortener & Link Analytics

**Open-source link management that tracks clicks, leads, and revenue.**

Create branded short links, manage custom domains, generate QR codes, and see
which campaigns generate signups and sales — not just clicks. Free to start,
with lead conversion tracking on Pro and revenue attribution on Growth.

Website: https://slugy.co
Try Slugy: https://app.slugy.co/signup

## See Slugy in Action

Live demo: https://slugy.co · App: https://app.slugy.co/signup

> Product screenshots live here once captured from a real running instance —
> see [`docs/screenshots.md`](./docs/screenshots.md) for the required captures
> (link creation; clicks, leads, and revenue dashboard). No mockups.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com/slugylink/slugy/pulls)

![GitHub Stars](https://img.shields.io/github/stars/slugylink/slugy?style=social)
![GitHub Forks](https://img.shields.io/github/forks/slugylink/slugy?style=social)
![GitHub Issues](https://img.shields.io/github/issues/slugylink/slugy)

[Live Demo](https://slugy.co) · [App](https://app.slugy.co) · [Report Bug](https://github.com/slugylink/slugy/issues) · [Request Feature](https://github.com/slugylink/slugy/issues)

</div>

---

## Why Slugy?

| Feature                 | Slugy (Open Source)                               | Dub.co                            | Bitly                  |
| :---------------------- | :------------------------------------------------ | :-------------------------------- | :--------------------- |
| **License**             | **MIT**                                           | AGPLv3 / Commercial               | Proprietary            |
| **Self-hosting**        | Yes, documented ([guide](./docs/self-hosting.md)) | Complex                           | No                     |
| **Free tier**           | 10 links/mo, 1k clicks, 1 domain                  | 25 links/mo, 1K events, 3 domains | 5 links/mo, 2 QR/mo    |
| **Custom domains**      | Included from free                                | 3 on free                         | Growth ($29/mo) and up |
| **Lead tracking**       | Pro ($8/mo)                                       | Business ($90/mo) and up          | Not offered            |
| **Revenue attribution** | Growth ($29/mo)                                   | Business ($90/mo) and up          | Not offered            |
| **Entry price**         | **$0 / $8 / $29**                                 | $0 / $30 / $90+                   | $0 / $10 / $29+        |

Competitor figures from public pricing pages, checked 9 October 2026 — verify before deciding.

---

## ✨ Features

| Feature                    | Description                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| 🔗 **Link shortening**     | Short, branded links with custom slugs, expiration & password protection  |
| 🌍 **Custom domains**      | Connect your own domain for fully branded links                           |
| 📱 **QR codes**            | Generate and customize QR codes for any link                              |
| 📊 **Click analytics**     | Clicks, referrers, countries, devices & more                              |
| 🎯 **Lead tracking**       | Attribute signups to the short link that drove them (Pro)                 |
| 💰 **Revenue attribution** | Attribute Shopify orders/sales back to the click that drove them (Growth) |
| 🌐 **Bio links**           | One personalized page for all your links (`bio.slugy.co`)                 |
| 📦 **Browser extension**   | Shorten links without leaving the page                                    |
| 💳 **Subscriptions**       | Plans and billing powered by Polar                                        |

---

## 🛠 Tech Stack

<div align="center">

![Tech Icons](https://skillicons.dev/icons?i=nextjs,ts,tailwind,prisma,postgres,redis,vercel,cloudflare,sentry,github)

</div>

| Category        | Tool                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | ![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=nextdotjs&logoColor=white) (App Router, React 19)                                      |
| Language        | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)                                                        |
| Styling         | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss&logoColor=white)                                                |
| Auth            | ![Better Auth](https://img.shields.io/badge/Better_Auth-000000)                                                                                      |
| ORM             | ![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)                                                                    |
| Database        | ![Neon Postgres](https://img.shields.io/badge/Neon_Postgres-00E599?logo=postgresql&logoColor=white)                                                  |
| Cache / Queue   | ![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-DC382D?logo=redis&logoColor=white) ![QStash](https://img.shields.io/badge/QStash-00C950) |
| Background jobs | ![Inngest](https://img.shields.io/badge/Inngest-000000?logo=inngest&logoColor=white)                                                                 |
| Analytics       | ![Tinybird](https://img.shields.io/badge/Tinybird-FF4A5B)                                                                                            |
| Email           | ![Resend](https://img.shields.io/badge/Resend-000000?logo=resend&logoColor=white)                                                                    |
| Storage         | ![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white)                                                  |
| Billing         | ![Polar](https://img.shields.io/badge/Polar-000000)                                                                                                  |
| Monitoring      | ![Sentry](https://img.shields.io/badge/Sentry-362D59?logo=sentry&logoColor=white)                                                                    |
| Hosting         | ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)                                                                    |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A Postgres database ([Neon](https://neon.tech) recommended)
- Upstash Redis account (for caching / rate limits)
- Optional: Tinybird, Resend, Polar, Cloudflare R2, Vercel accounts for full functionality

> **Self-hosting scope:** `docker-compose.yml` provisions local Postgres +
> a Neon-compatible proxy for development only — it is not a complete
> single-command production deployment of Slugy. The app itself (`npm run dev`)
> still needs the env vars in `.env.example`. See
> [`docs/self-hosting.md`](./docs/self-hosting.md) for mandatory vs optional
> dependencies, limitations, and support boundaries.

### 1. Clone and install

```bash
git clone https://github.com/slugylink/slugy.git
cd slugy
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local` — at minimum:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_APP_URL`

See `.env.example` for the full list.

### 3. Set up the database

```bash
npx prisma generate
npm run db:push
# or, for migrations:
npm run db:migrate
```

Optional seed:

```bash
npm run seed
```

### 4. Run locally

```bash
npm run dev
```

Open:

- Marketing site: <http://localhost:3000>
- App: <http://app.localhost:3000>

> Local subdomains (`app.localhost`) require custom-domain routing configured in `next.config.ts`. If `app.localhost:3000` does not resolve, add `127.0.0.1 app.localhost` to your hosts file.

### Useful scripts

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # start production server
npm run lint       # run ESLint
npm run db:studio  # open Prisma Studio
```

---

## 📁 Project Structure

```text
src/
  app/          # Next.js App Router routes (root, app, api)
  components/   # Reusable UI components
  lib/          # Helpers, clients, utils
  content/      # Blog / marketing content
prisma/         # Schema and migrations
extension/      # Browser extension source
scripts/        # Maintenance scripts
tinybird/       # Analytics pipes and datasources
```

---

## 🤝 Contributing

Contributions are welcome. To contribute:

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-change`
3. Make your changes with Prettier / ESLint passing (`npm run lint`)
4. Commit and push
5. Open a pull request against `main`

Please open an issue first for large changes so we can discuss the approach.

---

## 💖 Sponsor

If Slugy helps you, consider sponsoring:

[![GitHub Sponsor](https://img.shields.io/github/sponsors/slugylink?label=Sponsor&logo=GitHub&color=ff69b4)](https://github.com/sponsors/slugylink)

Supported by:

<a href="https://neon.tech" target="_blank" rel="noreferrer">
  <img src="https://i.postimg.cc/9z3nb7Q8/neon-logo.webp" alt="Neon" width="120" />
</a>

---

## 🔗 Connect

[![Website](https://img.shields.io/badge/slugy.co-000000?style=for-the-badge&logo=googlechrome&logoColor=white)](https://slugy.co)
[![X](https://img.shields.io/badge/@slugydotco-black?style=for-the-badge&logo=x&logoColor=white)](https://x.com/slugydotco)
[![Maintainer](https://img.shields.io/badge/@sandip_dev_07-black?style=for-the-badge&logo=x&logoColor=white)](https://x.com/sandip_dev_07)
[![GitHub](https://img.shields.io/badge/slugylink/slugy-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/slugylink/slugy)

---

## 📄 License

MIT © Slugy — see [LICENSE](./LICENSE).

<div align="center">

Built with 🐌 by the Slugy team

</div>
