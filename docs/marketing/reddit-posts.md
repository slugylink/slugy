# Reddit Post Drafts — Slugy

**Companion to:** [reddit-playbook.md](./reddit-playbook.md) ·
[reddit-comments.md](./reddit-comments.md)

---

## Rules that apply to every draft below

1. **Never submit a `slugy.co` short link as the post URL.** Filter-blocked.
   See playbook §1.
2. **No link in the title.** Every title below is text-only.
3. **Rewrite all of these.** They're structured angles, not publish-ready copy.
   Mods and readers both recognize templated AI prose instantly.
4. **Modmail before posting** anywhere non-obvious. Always.
5. **Weeks 1-2: comments only.** Don't post any of these until you've spent two
   weeks commenting. See playbook §4.
6. **Put real numbers in.** Every draft below has a `⚠️` where you need your own
   data. Invented numbers are the fastest way to get caught and it's not worth it.

---

## Draft 1 — The open-source Bitly alternative

**Best for:** `r/opensource`, `r/selfhosted`, `r/indiehackers`, `r/SaaS` (comments only — they ban launch posts)
**Angle:** Lead with MIT + self-hostable. Zero sales language.
**Risk:** Low. This is the single safest high-value post you can make.

**Title:**

> Open-source link shortener with real click analytics — MIT licensed, self-hostable

**Body:**

> Built an open-source link shortener and figure this sub might find it
> interesting since it doesn't need a signup to look at.
>
> **What it does:** short links with custom slugs, click analytics (referrers,
> countries, devices), QR codes, bio pages, custom domains.
>
> **Why it's MIT:** I wanted to be able to read the code that tracks every click
> on every link I share. If you run marketing, that's your customer data going
> to a vendor's database. Now you can just read it, or run the whole thing.
>
> **Stack** (if anyone wants to self-host): Next.js, Postgres, Redis,
> Tinybird for the click events, Inngest for background jobs.
>
> Repo is linked in my profile. It's MIT so fork it, self-host it, audit it, or
> tell me it's overengineered — I accept all four outcomes.
>
> ⚠️ **Before posting:** add your real star count and the honest reason you built
> it. Right now it's 92 stars, 15 forks.

**Why this works:** leads with the license and the audit argument, not the
features. `r/selfhosted` and `r/opensource` respond to the "I can read the code
that tracks my customers" angle hard. "Tell me it's overengineered" invites
criticism, which mods reward.

---

## Draft 2 — Build in public with real numbers

**Best for:** `r/buildinpublic`, `r/Entrepreneur`
**Angle:** Transparent numbers including failures. Highest-perform format.
**Risk:** Medium. `r/SaaS` bans this — comments only there.

**Title:**

> Open-source link shortener: month-by-month numbers, including the parts that didn't work

**Body:**

> Slugy is an open-source link shortener (MIT). Posting the real numbers, not the
> flattering ones.
>
> ⚠️ **Fill in with your actual figures.** Suggested structure:
>
> | Month | Signups | Paid | MRR | What I shipped |
> | ----- | ------- | ---- | --- | -------------- |
> | 1     |         |      |     |                |
> | 2     |         |      |     |                |
>
> **What worked:**
>
> - [channel] → [N] signups
> - [channel] → [N] signups
>
> **What didn't, which is most of it:**
>
> - Cold email: sent ⚠️[N], got ⚠️[N] replies. Zero.
> - [another failure] — [why you think it failed]
>
> **Biggest surprise:** [something specific and real]
>
> **Biggest mistake:** [the real one]
>
> **What I'd tell myself 3 months ago:** [advice, specific]
>
> Repo's in my profile. Open source, MIT — if you want to self-host it instead
> of using the hosted version, that works too and I'd honestly prefer it.

**Why this works:** failure sections get upvoted and commented on far more than
success sections. The closing "I'd prefer you self-hosted" is disarming and true.

---

## Draft 3 — Technical deep-dive

**Best for:** `r/programming`, `r/analytics`, `r/webdev`, `r/devops`
**Angle:** Pure engineering content. Promo optional and light.
**Risk:** Low. These subs tolerate dev posts about your own project.

**Title:**

> How I'm handling click analytics at volume — why I picked Tinybird over ClickHouse directly

**Body:**

> Long-ish post about the analytics layer of my link shortener. Posting here
> because I got the reasoning wrong twice first and the corrections might save
> someone else the time.
>
> **The shape of the problem:** append-only click events, millions/day,
> never updated, queried by time range + link ID + dimensions. Not relational
> reads, and absolutely not your primary database.
>
> **First attempt: Postgres.** Worked fine until ~⚠️[N]k events/day, then
> aggregate queries started timing out. Aggregating across time ranges against
> a growing table is exactly the wrong access pattern.
>
> **Why not ClickHouse directly:** ClickHouse is the better database for this.
> I picked Tinybird because it's SQL-flavored ClickHouse with pre-built API
> endpoints, so I got the write path and query path handled without writing an
> API layer. Real productivity win as a solo project. The cost is some query
> flexibility and an extra abstraction to learn.
>
> **Retention strategy:**
>
> - Raw events: ⚠️[N] days
> - Daily rollups: ⚠️[N] days
> - Cold storage beyond that
>
> That drop from raw to rollup cut storage roughly ⚠️[N]x.
>
> **The mistake that cost me the most time:** ⚠️[the real one]
>
> Happy to answer anything. Full disclosure: this is for my own project, MIT
> licensed, repo in my profile if you want to check my work.

---

## Draft 4 — Lessons learned / mistakes

**Best for:** `r/Entrepreneur`, `r/buildinpublic`, `r/startups`
**Angle:** Mistakes > wins on Reddit. Genuine vulnerability performs best.
**Risk:** Low.

**Title:**

> Three things I got wrong building a link shortener, since nobody posts this part

**Body:**

> Mistakes, since the launch posts are more common than the corrections.
>
> ⚠️ **Replace all three with real ones.** Structure that works:
>
> **1. [The mistake]** — what I assumed, what actually happened, what it cost.
>
> **2. [The mistake]** — same structure.
>
> **3. [The mistake]** — same structure.
>
> The one I'd most want to know before starting: [the hardest-won lesson]
>
> Happy to go into any of these in detail — the technical ones especially.

**Why it works:** nobody's seen "what it cost" stated plainly. That specificity
is what gets shared.

---

## Draft 5 — Comparison teardown

**Best for:** `r/Entrepreneur`, `r/SaaS` (comments only), `r/marketing`, `r/indiehackers`
**Angle:** Be fair to the competitor. Aggressive competitor bashing gets removed.
**Risk:** Medium — competitors may report it. Keep it factual.

**Title:**

> I compared 7 link shorteners on price, analytics depth and self-hosting — full table

**Body:**

> Went through every option I could find. Full table below, including the one I
> built, which is obviously going to be biased.
>
> | Tool              | Free tier              | Paid entry | Analytics                      | Self-host | MIT |
> | ----------------- | ---------------------- | ---------- | ------------------------------ | --------- | --- |
> | Bitly             | ⚠️                     | ⚠️         | ⚠️                             | No        | No  |
> | Dub.co            | ⚠️                     | ⚠️         | ⚠️                             | Yes       | Yes |
> | Short.io          | ⚠️                     | ⚠️         | ⚠️                             | No        | No  |
> | Blink             | ⚠️                     | ⚠️         | ⚠️                             | No        | No  |
> | Rebrandly         | ⚠️                     | ⚠️         | ⚠️                             | No        | No  |
> | TinyLink / others | ⚠️                     | ⚠️         | ⚠️                             | ⚠️        | ⚠️  |
> | Slugy             | 10 links/mo, 1k clicks | $8/mo      | Clicks, referrers, geo, device | Yes       | Yes |
>
> ⚠️ **Verify every figure above against each vendor's current pricing before
> posting.** Stale competitor pricing is the fastest way to get a post removed
> and a reputation for being unreliable.
>
> **What surprised me:** [the non-obvious finding — usually a pricing cliff or a
> > export limit]
>
> **Where each one actually wins:**
>
> - If you need enterprise SSO: [vendor], no contest
> - If you want zero infrastructure: [vendor]
> - If you want to read the code that tracks your customers: open source, full stop
>
> Full disclosure: I maintain Slugy so treat that row accordingly. Deep dives on
> any of these in the comments if useful.

**Why it works:** "including the one I built, which is obviously biased" plus
"where each one wins" is credibility you cannot buy.

---

## Draft 6 — AMA

**Best for:** `r/startups`, `r/Entrepreneur`, `r/indiehackers`, `r/buildinpublic`
**Angle:** Requires **mod approval in advance**. Start the process 2-3 weeks out.
**Risk:** Low once approved. High engagement ceiling.

**Modmail template:**

> Hi — I'm the maintainer of Slugy, an open-source link shortener (MIT).
> Would you be open to an AMA about building an open-source SaaS that competes
> with well-funded incumbents?
>
> Happy to take questions specifically about: pricing against funded competitors,
> open-sourcing a product with paid tiers, solo-founding, Tinybird/analytics
> architecture. I won't be linking anything promotional — it's MIT and the repo
> is in my profile either way.
>
> Totally fine if not a fit for this sub.

**Title:**

> AMA — I build an open-source link shortener ($8/mo) competing with Bitly and Dub

**Body template:**

> Happy to answer anything. Starting with the honest version:
>
> - Product: open-source link shortener, MIT licensed
> - Stage: ⚠️[current signups / MRR / growth]
> - Solo founder: [yes/no]
> - Competitors with far more money: Bitly, Dub, Blink, Short.io
>
> **Things I'd rather talk about than my launch:**
>
> - How do you price against a funded incumbent?
> - Open-sourcing a product that also has paid tiers — has it helped or hurt?
> - [Your actual hardest problem]
>
> **What I'm least qualified to answer:** [honest gap]
>
> AMA.

**Note:** The "what I'd rather talk about" section is what makes an AMA perform.
Moderators and readers are exhausted by launch AMAs.

---

## Draft 7 — Free tool / resource share

**Best for:** `r/Entrepreneur`, `r/smallbusiness`, `r/marketing`, `r/webdev`
**Angle:** Give something useful away. Zero product mention.
**Risk:** Low. Highest safety, moderate reward.

Slugy has two real free tools, no signup required:

- `slugy.co/tools/qr-code-generator`
- `slugy.co/tools/utm-builder`

**Title:**

> Free UTM builder + QR generator, no signup, no email required — thought this might help someone

**Body:**

> Built two small tools for tracking links and thought they might be useful to
> people here rather than just to me.
>
> **UTM builder** — builds campaign-tagged URLs for Google Analytics, with
> presets for the common channels so you don't typo `utm_medium` for the
> fourteenth time.
>
> **QR generator** — generates and customizes QR codes, including branded ones
> for print.
>
> Neither asks for an account or an email address. ⚠️ **Confirm this is still
> true** — if either now requires signup, say so up front or the post will get
> removed and you'll deserve it.
>
> They're part of a project I work on (open source, MIT), but there's no upsell
> here — genuinely just the two tools. Hoping they save someone a Google
> search.

**Why this works:** genuinely useful, and admitting there's a project behind it
without any pitch is exactly what makes it survive.

---

## Draft 8 — The non-obvious build story

**Best for:** `r/buildinpublic`, `r/indiehackers`, `r/Entrepreneur`
**Angle:** One specific problem, told properly.
**Risk:** Low.

**Title:**

> Why I built an open-source link shortener when Dub.co already exists (and is better than mine in every way)

**Title alternative:**

> Honest comparison: my open-source link shortener vs Dub.co, written by the person who's biased

**Body:**

> The obvious question is why build another link shortener when open-source
> options already exist. Fair question.
>
> ⚠️ **Use the real reason.** Structure that works:
>
> **The reason:** [the actual specific trigger — a price cliff you hit, an
> > export limit, a data-residency requirement, a missing feature you needed]
>
> **What Dub.co does better than mine:**
>
> - [be specific and generous — genuinely name the advantages]
>
> **Where mine differs:**
>
> - [one or two real, verifiable differences]
>
> **Where I fully expect mine to lose:**
>
> - [feature gap, honestly]
>
> Both are MIT. If you're choosing, pick Dub.co unless you specifically need
> ⚠️[the actual reason]. That would be the correct call for most people.

**Why it works:** the title's second half openly invites comparison and admits
inferiority. Extremely hard to report as spam, and commenters will point out
where you're wrong, which is engagement.

---

## Draft 9 — Answer a question with a post

**Best for:** Any sub, when someone asks a question worth 500 words.
**Angle:** Turn a good comment into a post. Slowest to pay off, longest tail.

**Trigger:** Someone asks something like "how do I track which campaign
generated a signup?" and your comment gets upvotes.

**Title:**

> How do you actually attribute a signup back to the link that produced it?

**Body:**

> Answering this properly since it came up and my two-line comment was
> unsatisfying.
>
> ⚠️ **The core technical content:**
>
> 1. The problem: click analytics and conversion data live in different systems
> 2. Why client-side is painful (ad blockers eat it)
> 3. Server-side approach: unique ID per link → persist through signup → join
> 4. Edge cases: multi-device journeys, users who clear cookies, email signups
>
> Full working example in my open-source implementation — repo in my profile.
>
> Happy to go deeper on any step. This part took me ⚠️[N] days to get right and
> most of the gotchas are not obvious.

**Why it works:** the question already exists and already has an audience. The
post inherits the demand, and it ranks for years.

---

## Draft 10 — Monthly transparency

**Best for:** `r/buildinpublic`, `r/startups`
**Angle:** Recurring. Builds a series people follow.
**Risk:** Low. Only works if you keep publishing.

**Title:**

> Month [N]: [revenue] MRR, [N] signups, and the one change that mattered

**Body:**

> Monthly update. Keeping these public because the trend matters more than any
> single month.
>
> ⚠️ MRR: [$X]
> ⚠️ Signups: [N]
> ⚠️ Churn: [N]
>
> **The one change that moved the number:** [single change + why]
>
> **What didn't move it, despite trying:** [honest negative result]
>
> **Next month's bet:** [one specific thing]
>
> **Correction to last month's post:** ⚠️[if you overstated something, own it
> > here. Nothing builds trust faster and mods notice.]

---

## Posting order

Week 3 onward, roughly one per week:

| Week | Draft                     | Sub                                                                                   |
| ---- | ------------------------- | ------------------------------------------------------------------------------------- |
| 3    | Draft 7 (free tools)      | Lowest-stakes sub. Warm up the format.                                                |
| 4    | Draft 1 (OSS alternative) | r/opensource or r/selfhosted. Strongest draft — deploy the good one once you're warm. |
| 5    | Draft 4 (mistakes)        | r/Entrepreneur                                                                        |
| 6    | Draft 2 (build in public) | r/buildinpublic                                                                       |
| 7    | Draft 3 (technical)       | r/analytics                                                                           |
| 8    | Draft 6 (AMA)             | Modmail 2-3 weeks before this.                                                        |
| 9+   | Draft 5, 8, 10            | Rotate, one per week.                                                                 |

Do not post Draft 1 or 2 anywhere `r/SaaS` — Rule 11 bans launch announcements
and promotions outright. Comments only there.

---

## After posting

1. **Be in the comments for the first 2 hours.** Reply to every question, even
   short ones. That window is most of the engagement.
2. **Never ask for upvotes.**
3. **Never share the post link anywhere else** to drive traffic. That's vote
   manipulation.
4. **If removed, read why.** Add the lesson to playbook §3. Don't repost.
5. **Log it** in `.socials/posts.md`.
6. **Check the thread at 24h, 7d, 30d.** Threads that rank keep producing.
