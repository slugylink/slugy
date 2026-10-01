# 5-Day Reddit Sprint — Slugy

**Companion to:** [reddit-playbook.md](./reddit-playbook.md) ·
[reddit-comments.md](./reddit-comments.md) · [reddit-posts.md](./reddit-posts.md)

**Pace:** comment-heavy, 1 post/day
**Daily time:** ~25 min (10 min comments + 10 min post + 5 min logging)

---

## Read this first

Two rules apply to every piece of content below. They're not style preferences.

1. **No `slugy.co/xxxxx` short links. Anywhere.** Full URLs only
   (`slugy.co`, `github.com/slugylink/slugy`). Reddit blocks shortener domains
   sitewide and mods can't undo it.
2. **No link in any title.** Every title below is text-only.

**The sprint reality check:** 5 days of sprinting won't produce meaningful
revenue. Comments on day 1-2 rarely get read by the people who'd buy. What
you're actually doing here is loading activity onto an account that's about to
start ranking threads on Google, and that's the asset. Judge this sprint on
whether you can sustain it for a month, not on signups by Friday.

**If you only have one day of energy:** do Day 1. It's comments only, zero risk,
and it sets up the rest.

---

# DAY 1 — Comments only, no post

**Goal:** establish you as a useful participant. Zero promotional surface.

**Subreddits today:** r/analytics, r/webdev, r/programming, r/SaaS, r/Entrepreneur

**Do 6-8 comments. Link nothing. Mention Slugy zero times.**

### Comment A — r/analytics

_Find a thread asking about event tracking, click analytics, or high-volume event data._

> For click/event analytics at volume the split that matters is write path vs
> read path.
>
> **Write path** (high volume, append-only, never updated): ClickHouse,
> Tinybird, or BigQuery. Postgres starts falling over somewhere in the region of
> 50k events/day depending on indexing, mostly because aggregating across time
> ranges against a growing table is the exact opposite of what a relational DB
> is good at.
>
> **Read path** (aggregation, dashboards): query whichever of those is
> cheapest. Don't run analytics queries against your primary database.
>
> The mistake I see most is using one relational DB for both — the indexes end
> up fighting each other.
>
> Retention is the other decision: keep raw log events ~90 days, roll up to
> daily aggregates and keep those a year. Storage drops roughly 30x.

### Comment B — r/webdev

_Find a thread about redirect handling, link routing, or URL parsing._

> Worth being careful about redirect chains here — A → B → C can slow crawling
> and dilute signals even though none of the individual hops looks bad.
>
> Two rules I've landed on: keep it to one hop (don't wrap a link that's already
> behind a redirect, like a UTM-tagged affiliate URL), and make sure the
> shortened domain doesn't resolve somewhere different from what it suggests.
>
> If you control the shortener you can reason about this properly. If you're on
> a shared one you can't.

### Comment C — r/SaaS

_Find a thread about analytics tooling, pricing, or growth. This sub bans promo
outright — comment helpfully and don't name Slugy._

> The thing I'd check first is whether you're paying for a tier to solve a
> problem you could solve without one.
>
> A lot of "this tool is too expensive" is a plan-threshold problem rather than a
> vendor problem. Custom link previews and multiple custom domains are the two
> features that most often push people up a tier, and both have free
> alternatives.
>
> Reverse it: list what you actually use from the tool. If you use two features,
> there's almost certainly a cheaper plan, or a different category of tool
> entirely.

### Comment D — r/Entrepreneur

_Find a thread about marketing attribution or campaign tracking._

> Attribution is the part where most marketing gets vague, so let me be
> concrete.
>
> Click analytics tells you how many people arrived. Conversion analytics tells
> you whether arriving was worth anything. A link with 4,000 clicks and zero
> signups is a genuinely useful signal that click count alone can never give you.
>
> To do the second part properly you need a unique ID per link, persisted
> through signup, joined against your own data server-side. Client-side is close
> to hopeless because ad blockers eat it.
>
> Hardest part isn't the implementation, it's multi-device journeys and the users
> who clear cookies mid-flow.

### Comment E — r/startups or r/programming

_Find a thread about solo founding or stack choices._

> Solo-maintained stack, in case it's useful: Next.js, Postgres, Redis, Tinybird
> for click events, Inngest for background jobs, Cloudflare R2 for storage.
>
> The decision I'd argue about is Tinybird vs ClickHouse directly. ClickHouse is
> the better database for the job. I went with Tinybird because it's
> SQL-flavored Clickhouse with pre-built API endpoints, so I got write and query
> paths handled without writing an API layer — a real productivity win solo. The
> cost is some query flexibility and another abstraction to learn.

### Comment F + G — anywhere relevant

_Just answer questions well. Upvote a few things. No agenda._

**End of Day 1:** no post, no link, no mention. Check: have you used Slugy's
UTM builder at all? You'll need it from Day 2.

---

# DAY 2 — First post (lowest risk)

**Goal:** get one post live somewhere safe.

**Post today:** Draft 7 — the free tools post. This is the lowest-risk post
available because it gives something away.

### VARIANT A — r/Entrepreneur, r/smallbusiness, r/marketing

**Title:**

> Free UTM builder + QR generator, no signup, no email required — thought this might help someone

**Body:**

> Built two small tools for tracking links and thought they might be useful to
> people here rather than just to me.
>
> **UTM builder** — builds campaign-tagged URLs, with presets for the common
> channels so you don't typo `utm_medium` for the fourteenth time.
>
> **QR generator** — generates and customizes QR codes including branded ones
> for print.
>
> Neither asks for an account or an email address.
>
> They're part of an open-source project I work on (MIT), but there's no upsell
> here — genuinely just the two tools. Hoping they save someone a Google search.
>
> Tools: slugy.co/tools/utm-builder and slugy.co/tools/qr-code-generator
>
> ⚠️ **Verify both tools are still no-signup before posting.** If either changed,
> say so in the first line or this gets removed.

### VARIANT B — r/webdev, r/nocode

**Title:**

> Two dependency-free tools I built: UTM builder and QR generator, no signup

**Body:**

> Wrote these as utilities for my own link management thing and figured they
> might be independently useful.
>
> **UTM builder** — campaign URL builder with channel presets. Works client-side,
> nothing uploaded anywhere.
>
> **QR generator** — generates QR codes with color and logo customization.
>
> No account, no email, no server round-trip. MIT licensed, so the source is in
> my profile if you'd rather self-host them than use the hosted version.
>
> Free at slugy.co/tools/utm-builder and slugy.co/tools/qr-code-generator

### VARIANT C — r/selfpromotion (weekly megathread only)

**Title:** follow that thread's exact required format — read it, don't guess

**Body:**

> Open-source link shortener (MIT). Free tier: 10 links/month + 1k tracked
> clicks, custom slugs, QR, bio pages, click analytics. $8/mo Pro unlocks 250
> links/month, 10k clicks, custom domains, and 12-month retention.
>
> Hosted or self-host it — repo's in my profile, full disclosure I'm the
> maintainer.
>
> slugy.co/pricing for the full breakdown.

**Comments today (6-8):** the same pool as Day 1. Use Comment A, C, D from
Day 1. Mention Slugy in at most 2, only where it genuinely answers the question.

**Modmail:** if posting to r/smallbusiness or anywhere non-obvious, message
first. One line: "Planning to post a free no-signup UTM/QR tool post, no
signup wall, MIT licensed — okay?"

---

# DAY 3 — The open-source angle

**Post today:** Draft 1. This is your strongest draft. Deploy it now, warm.

**Do NOT post this in r/SaaS.** Rule 11 bans launch announcements.

### VARIANT A — r/opensource

**Title:**

> Open-source link shortener with real click analytics — MIT licensed, self-hostable

**Body:**

> Built an open-source link shortener and figured this sub might find it
> interesting since it doesn't need a signup to look at.
>
> **What it does:** short links with custom slugs, click analytics (referrers,
> countries, devices), QR codes, bio pages, custom domains.
>
> **Why MIT:** I wanted to be able to read the code that tracks every click on
> every link I share. If you run marketing, that's your customer data going into
> a vendor's database. Now you can read it, or run the whole thing yourself.
>
> **Stack** if you're self-hosting: Next.js, Postgres, Redis, Tinybird for
> click events, Inngest for background jobs.
>
> ⚠️ Add your current star/fork count (92 stars, 15 forks as of this writing).
>
> Repo's linked in my profile. MIT, so: fork it, self-host it, audit it, or tell
> me it's overengineered — I accept all four outcomes.

### VARIANT B — r/selfhosted

**Modmail first.** This sub is strict about promotion — ask before posting.

**Title:**

> Open-source link shortener (MIT) — self-hostable, click analytics included

**Body:**

> Made an open-source link shortener if anyone here is interested. Main reason
> it's MIT is that I didn't want my customer click data sitting in someone
> else's database, and running it myself solves that.
>
> **What it does:** custom short slugs, click analytics (referrers, countries,
> devices), QR generation, bio pages, custom domains.
>
> **Requirements to self-host:** Postgres, somewhere to run a Node process, and
> a custom domain with TLS. Analytics is the only piece that takes real thought
> — high write volume, so it's on Tinybird.
>
> ⚠️ Stars: [92]. Honest caveat: if you need zero downtime and someone else
> handling uptime, hosting it is cheaper than your time.
>
> MIT, repo in my profile. Tell me what you'd want different if you're actually
> going to run it.

### VARIANT C — r/selfhosted, smaller alternative

_Use only if A or B got removed or you skipped them._

**Title:**

> What I learned self-hosting a link shortener (analytics was the hard part, not the app)

**Body:**

> Not really a promotion — writing up the parts that were harder than expected,
> in case someone else goes down this path.
>
> **The app is trivial.** It's a lookup table. Postgres + a Node process + a
> domain.
>
> **The analytics is not.** Append-only click events at high write volume are a
> completely different problem from serving requests. My first attempt used
> Postgres and fell over around ⚠️[N]k events/day. Tinybird fixed it.
>
> **Retention matters more than you think.** Raw events 90 days, daily rollups a
> year. Storage drops ~30x.
>
> Repo's MIT and in my profile if useful. Would especially like to hear from
> anyone running something similar — what did you use?

**Comments today (6-8):** Prioritize r/analytics, r/devops, r/webdev,
r/programming. Comment B and E from Day 1 work here. You can mention Slugy
explicitly in these subs since technical discussion about your own project is
normal, not promotional.

---

# DAY 4 — Mistakes and honesty

**Post today:** Draft 4. Mistakes outperform wins on Reddit, consistently.

**Subreddit:** r/Entrepreneur, r/buildinpublic, or r/startups.

### VARIANT A — r/Entrepreneur

**Title:**

> Three things I got wrong building a link shortener, since nobody posts this part

**Body:**

> Mistakes, since launch posts are more common than the corrections.
>
> ⚠️ **Replace with your real ones. Structure:**
>
> **1. [The mistake]** — what I assumed, what actually happened, what it cost.
>
> **2. [The mistake]** — same structure.
>
> **3. [The mistake]** — same structure.
>
> The one I'd most want to know before starting: [your hardest-won lesson]
>
> Open source, MIT, repo in my profile if you want to check any of my claims
> rather than take my word for it.

### VARIANT B — r/buildinpublic

**This sub rewards maximum transparency. Go harder than feels comfortable.**

**Title:**

> Month-by-month on my open-source link shortener: real numbers, including the parts that didn't work

**Body:**

> Slugy is an open-source link shortener (MIT). Real numbers, not the flattering
> ones.
>
> ⚠️ **Fill in actuals:**
>
> | Month | Signups | Paid | MRR | Shipped |
> | ----- | ------- | ---- | --- | ------- |
> | 1     |         |      |     |         |
> | 2     |         |      |     |         |
>
> **What worked:**
>
> - [channel] → [N] signups
> - [channel] → [N] signups
>
> **What didn't, which is most of it:**
>
> - Cold email: sent ⚠️[N], got ⚠️[N] replies. Zero.
> - [failure] — [why you think it failed]
>
> **Biggest surprise:** [something specific]
>
> **Biggest mistake:** [the real one]
>
> Repo's in my profile. If you're further along than this, genuinely tell me
> what you're doing differently.
>
> (Full disclosure that it's my own product was already obvious from the title.)

### VARIANT C — r/marketing

**If targeting marketers specifically.**

**Title:**

> Tracking links without overpaying: what a $29/mo tool actually needs to do

**Body:**

> Walked through what link management genuinely requires versus what's usually
> sold as a requirement. Might save someone a tier upgrade.
>
> **Actually needed:**
>
> - Short links with custom slugs ✓ (every tool has this)
> - Custom domain for brand consistency
> - Per-link click counts
>
> **Often sold as essential, usually isn't:**
>
> - Custom link previews — costs money at every vendor, costs nothing to set
>   yourself with OG tags
> - Password protection on links — how often do you actually need this?
> - "Enterprise" support
>
> **Worth paying for if you have it:** real conversion attribution, i.e. knowing
> which link produced a signup. Click counts alone tell you very little.
>
> ⚠️ Add: what's actually in the free tier vs $8 vs $29 for slugy.co if you want
> to be transparent, or leave it out entirely and let people ask.
>
> Full disclosure: I build a link shortener, so I'm not neutral. Repo is in my
> profile.

**Comments today (6-8):** r/marketing, r/Entrepreneur, r/analytics,
r/smallbusiness. Comment D from Day 1 fits perfectly here.

---

# DAY 5 — Technical or the honest comparison

**Post today:** Draft 3 (technical) or Draft 5 (comparison). Pick based on
where your energy is.

### VARIANT A — Technical: r/analytics, r/programming, r/devops

**Title:**

> How I'm handling click analytics at volume — why I picked Tinybird over ClickHouse directly

**Body:**

> Post about the analytics layer of my link shortener. Got the reasoning wrong
> twice first, so the corrections might save someone the time.
>
> **The shape of the problem:** append-only click events, millions/day, never
> updated, queried by time range + link ID + dimensions. Not relational reads,
> and absolutely not your primary database.
>
> **First attempt: Postgres.** Fine until ~⚠️[N]k events/day, then aggregate
> queries timed out. Aggregating across time ranges against a growing table is
> exactly the wrong access pattern for a relational DB.
>
> **Why not ClickHouse directly:** ClickHouse is the better database for this.
> I picked Tinybird because it's SQL-flavored ClickHouse with pre-built API
> endpoints, so I got write and query paths handled without writing an API layer.
> Genuine productivity win solo. Costs some query flexibility.
>
> **Retention:**
>
> - Raw events: ⚠️[N] days
> - Daily rollups: ⚠️[N] days
> - Cold storage beyond
>
> Raw → rollup cut storage roughly ⚠️[N]x.
>
> **The mistake that cost me the most time:** [real one]
>
> Happy to answer anything. Full disclosure: this is for my own project, MIT
> licensed, repo in my profile if you'd rather check my work.

### VARIANT B — Comparison: r/Entrepreneur, r/indiehackers

**Not r/SaaS — Rule 11 bans promotion and recommendations there.**

**Title:**

> I compared 7 link shorteners on price, analytics and self-hosting — full table

**Body:**

> Went through every option I could find. Full table below, including the one I
> built, which is obviously biased.
>
> | Tool      | Free tier              | Paid entry | Analytics                      | Self-host | MIT |
> | --------- | ---------------------- | ---------- | ------------------------------ | --------- | --- |
> | Bitly     | ⚠️                     | ⚠️         | ⚠️                             | No        | No  |
> | Dub.co    | ⚠️                     | ⚠️         | ⚠️                             | Yes       | Yes |
> | Short.io  | ⚠️                     | ⚠️         | ⚠️                             | No        | No  |
> | Blink     | ⚠️                     | ⚠️         | ⚠️                             | No        | No  |
> | Rebrandly | ⚠️                     | ⚠️         | ⚠️                             | No        | No  |
> | Slugy     | 10 links/mo, 1k clicks | $8/mo      | Clicks, referrers, geo, device | Yes       | Yes |
>
> ⚠️ **Verify every competitor figure against current pricing before posting.**
> Stale competitor pricing gets posts removed fast and earns a reputation for
> being unreliable.
>
> **What surprised me:** [the non-obvious finding — usually a pricing cliff or
> > an export limit]
>
> **Where each one actually wins:**
>
> - Enterprise SSO: [vendor], no contest
> - Zero infrastructure: [vendor]
> - Read the code that tracks your customers: open source, full stop
>
> Full disclosure: I maintain Slugy so treat that row accordingly.
>
> Happy to deep dive on any of these in the comments.

### Post-AMA prep — Day 6 and beyond

**Don't run the AMA yet.** Modmail needs 2-3 weeks lead time. If you want it,
message mods today (Day 5) so it lands around week 4.

Template from [reddit-posts.md](./reddit-posts.md) §Draft 6.

---

# Comment pool — reprint

Six comments you can rotate across all five days. Rework them so they don't
read identically — copy-paste dupe content across threads is a spam signal.

1. **Analytics architecture** (r/analytics) — write vs read path split, Postgres
   ceiling, retention math
2. **Redirect chains** (r/webdev) — one-hop rule, OG tags vs paid previews
3. **Paying for the wrong tier** (r/SaaS, r/Entrepreneur) — the two features
   that push people up tiers unnecessarily
4. **Attribution** (r/Entrepreneur, r/marketing) — clicks vs conversions,
   server-side ID persistence, multi-device as the hard part
5. **Stack choices** (r/programming, r/startups) — Tinybird vs ClickHouse, full
   disclosure
6. **Shortener pricing cliffs** (r/Entrepreneur) — check the tier before
   switching, "tell me what you actually use"

---

# Daily checklist

**Every day, ~25 minutes:**

- [ ] Shadowban test if not done this week (playbook §6)
- [ ] Check alerts: `bitly alternative`, `url shortener`, `dub.co alternative`
- [ ] Post the day's post — **manually, no scheduler**
- [ ] 6-8 comments, at least 4 in subs with no Slugy involvement
- [ ] Stay under 10% promotional for the week
- [ ] Reply to every reply on your own posts (this is what compounds)
- [ ] Log in `.socials/posts.md`

**Never:** automated posting · alt accounts · asking for upvotes · sharing
post links elsewhere to drive traffic · DMing anyone · `slugy.co/xxx` short links

---

# What success looks like

| Day | Realistic signal                                               |
| --- | -------------------------------------------------------------- |
| 1   | Nothing. This is the point — you're buying karma and context.  |
| 2   | A few upvotes, 1-2 profile visits, maybe 1 signup              |
| 3   | First real discussion. Possibly one hostile reply — see below. |
| 4   | Best chance of a post hitting the front page of a small sub    |
| 5   | Threads start getting impressions outside your profile         |

**Zero signups by Friday is a normal, successful outcome.** The value here is
the compounding: threads that rank on Google keep producing for a year, and
ChatGPT/Perplexity read them when people ask about link shorteners. You're not
chasing Friday's number, you're building the thing that pays in month three.

---

# If something goes wrong

**Post removed:** read why, note it, don't repost. Don't argue with the mod.

**Hostile reply** ("this is just an ad", "open source as a marketing tactic"):
concede immediately, don't defend. Best response is agreeing it's fair and
pointing out the MIT license lets them verify. Arguing is what escalates to a sub
ban.

**Shadowban detected:** stop all promotion for 3-5 days. Zero links. Return with
genuine comments only. Re-test after a week.

**Sub ban:** respect it permanently. Message the mod once, professionally, move on.

**Sitewide suspension:** stop everything. Appeal at
https://support.reddithelp.com. **Do not create a new account to continue** — that
converts a recoverable situation into a permanent one.
