# Reddit Comment Library — Slugy

**Companion to:** [reddit-playbook.md](./reddit-playbook.md)

---

## How to use these

**These are angles, not scripts.** Paste-ready templates are actively harmful
here: Reddit detects AI-formatted replies, and mods who spot a canned comment
will remove it — sometimes your entire comment history.

The workflow:

1. Find a thread where the query below genuinely applies.
2. Read the whole thread, including other replies. Note what has already been
   said so you don't repeat it.
3. Read the sub's rules.
4. Take the **angle**, answer the question in your own words, and add something
   the other replies don't have.
5. Disclose: "Full disclosure: I built Slugy."
6. **Usually include no link at all.** See §9 below.

Rewrite every one. If it reads like a template, it will get removed.

---

## The link rule for comments

**Default to no link.** Answer, name Slugy, disclose, stop. Your profile has
your links.

Comments with links are removed far more often than comments without them, and
the profile click you're optimizing for happens anyway.

Include a full URL only when:

- The thread is specifically asking where to find something, AND
- `slugy.co` (bare, no short link) or `github.com/slugylink/slugy` is the direct answer

Never a `slugy.co/xxxxx` short link. See playbook §1.

---

## Disclosure lines that work

Pick one, vary it, sound natural:

- "Full disclosure: I build Slugy, so take this with a grain of salt."
- "Noticing my own bias here — I made the thing I'm about to mention."
- "I run an open-source link shortener (slugy.co), so I may be a bad judge, but..."
- "Shameless plug incoming: I built this."

The last one works well on `r/buildinpublic`, where open promotion is expected.
Avoid it in `r/selfhosted` and `r/webdev`.

---

## 1. "Best URL shortener for X"

The highest-intent query there is. People are actively choosing a vendor.

**Angle:** Split the answer by use case. Most people asking this don't need what
they think they need.

**Draft:**

> Depends entirely on what you're optimizing for, and the popular names are
> usually optimized for someone else's use case.
>
> If it's mostly marketing links and you want to see which campaigns actually
> convert: [tool A] and [tool B] both do real attribution, and that's the only
> thing worth paying for.
>
> If you just need branded short links with a custom domain and don't want to
> think about it: Bitly's fine, ignore the bells.
>
> If you want to actually own the data or self-host it: that's a different
> category entirely and nobody advertises in it because there's no revenue in it.
>
> Happy to go deeper on whichever one matches. Full disclosure: I run an
> open-source one in that last category, so I'm not neutral.

**Why it works:** genuinely useful, explicitly flags bias, mentions Slugy last
and without a link.

---

## 2. "Dub.co alternative" / "Bitly alternative"

**Angle:** Be fair to the incumbent. Name what they do better.

**Draft:**

> I looked hard at both before picking, so: if you're already happy, there's no
> reason to move. [Incumbent] does [specific thing] better than anything open
> source does — no contest.
>
> The reason people look for alternatives is usually one of two things:
>
> 1. **Pricing cliffs.** Free tier is great until you cross one link/click
>    threshold and suddenly it's 10x more expensive than you budgeted.
> 2. **You want your link data in your own database.** Not "exportable" — you
>    actually have it.
>
> If it's #1, honestly, just downgrade instead of switching. Cheaper.
>
> If it's #2, self-hosting is the only real answer and you're picking between
> two good projects. Full disclosure — I maintain one of them.

**Why it works:** tells them not to switch if they don't need to. That
credibility is what makes the mention land.

---

## 3. "How do I track clicks on my links?"

**Angle:** Clarify that this is a solvable problem, and separate vanity clicks
from conversions.

**Draft:**

> Worth separating two things people mean by "track clicks":
>
> **How many people clicked** — most shorteners do this. It's the easy part.
>
> **Whether those clicks turned into signups/purchases** — most don't, and this
> is where it's actually useful. A link that got 4,000 clicks and zero signups
> tells you something important that click count alone never will.
>
> On the second one, the trick is passing an ID through and joining it against
> your own data server-side. Client-side is a pain because of ad blockers.
>
> Happy to go into the implementation if useful. (Full disclosure: I built a
> tool that does this, and it's MIT if you'd rather just read the code.)

---

## 4. "Bitly is expensive / what's a cheaper Bitly"

**Angle:** Don't just drop a cheaper name. Point at the actual fix.

**Draft:**

> Before switching, check what you're actually paying for. A lot of "Bitly is
> expensive" is a plan-tier problem, not a vendor problem.
>
> Specifically: are you on a paid tier for features you don't use? Custom link
> previews and multiple domains are usually the things pushing people up a tier,
> and there are free ways to handle both.
>
> If you've genuinely compared and Bitly is still wrong for you, then the
> honest split is:
>
> - **Want cheap + hosted:** the small/indie tier of most tools, or Short.io's
>   entry plan
> - **Want free forever + don't mind running it:** self-host. [mention here]
>
> Happy to share the actual feature list you probably don't need if you tell me
> what you're using it for.

**Why it works:** the "tell me what you're using it for" is a genuine offer of
help that also surfaces their use case for you.

---

## 5. "Self-host a link shortener?"

**Angle:** Direct answer. Be honest that self-hosting is real work.

**Draft:**

> Yes, and it's one of the easier things to self-host — no email sending, no
> payment processing, no user-generated content. It's mostly a database and a
> lookup table.
>
> Rough requirements: Postgres, a place to run a Node process, and a custom
> domain with TLS. Analytics is the only part that takes thought, since you
> need something that can handle high write volume.
>
> MIT licensed ones exist. [link here if genuinely relevant]
>
> Honest caveat: if you need zero downtime and someone else handles uptime,
> hosting it is cheaper than your time.

**Sub note:** `r/selfhosted` and `r/privacy` tolerate this because it's a
technical answer to a technical question. Link freely here if the thread is
specifically about self-hosting.

---

## 6. "What should I use for links in my bio / link-in-bio?"

**Angle:** Bio links are a different product category. Say so.

**Draft:**

> Link-in-bio tools get sold as "shorteners" but they're solving a different
> problem — one page with multiple destinations vs. short links you scatter.
>
> What actually matters for bio links:
>
> - Does it need analytics per-link, or just total clicks?
> - Do you need it to work without a JS framework loading?
> - Are you going to change the links often? (If yes, you want an editor, not a
>   shortener)
>
> Honestly for most people a simple static page plus a shortener is enough and
> you don't need a product at all.
>
> (Disclosure: I built one of these, MIT licensed, if you want to look at how it
> works.)

---

## 7. "Do shortened links hurt SEO / will Google penalize them?"

**Angle:** Genuinely technical. No promo. This is a knowledge-share play.

**Draft:**

> Short answer: no, but it matters which kind.
>
> Google's been explicit that shortened URLs aren't penalized per se. What gets
> penalized is redirect chains and links to low-quality or malware-flagged
> destinations. Redirect chains are the real risk — A → B → C can slow crawling
> and dilute signals.
>
> Two practical rules:
>
> 1. **One hop.** Never short a link that's already behind a redirect (UTM
>    tagged → short → affiliate link). Link the final destination directly.
> 2. **Don't hide anything.** If a shortened link resolves somewhere different
>    from what the domain suggests, that's a bad time.
>
> Also worth knowing: if you self-host your shortener you control this
> completely. Third-party shortener domains carry a reputation risk you don't
> own.

---

## 8. "Analytics stack recommendations" (r/analytics, r/programming)

**Angle:** Pure technical content. Slugy mentioned once, late, or not at all.

**Draft:**

> For click/event analytics at volume, the split that matters is:
>
> **Write path (high volume, append-only, never updated):** ClickHouse,
> Tinybird, or BigQuery. These are built for millions of rows/day. Postgres
> will fall over around 50k events/day depending on your indexing.
>
> **Read path (aggregation, dashboards):** Query whichever of the above is
> cheapest. Don't run analytics queries against your primary DB.
>
> The mistake most people make is using a relational DB for both. Writes and
> analytical scans have completely different access patterns and the indexes
> fight each other.
>
> Retention is the other decision: log-level raw events for a year, roll up to
> daily aggregates and drop the raw after ~90 days. Costs drop ~30x.

_Optional, only if genuinely relevant and the thread invites it:_

> Full disclosure: I built a link shortener on Tinybird for exactly this shape
> of problem and had to learn all of it the hard way.

---

## 9. "How did you get your first 100 users?"

**Angle:** Be honest. Real numbers, including the bad ones. r/Entrepreneur and
r/buildinpublic both reward this heavily.

**Draft:**

> Full disclosure — I'm still working on this, so take the numbers skeptically.
>
> What worked:
>
> - [real channel] — brought in ~[N] signups in [timeframe]
> - [real channel] — slower but higher intent
>
> What didn't work, and this is most of it:
>
> - Cold outreach. Sent [N], got [N] replies. Genuinely zero.
> - [other failed thing] and why
>
> Biggest surprise: [something real and specific]
>
> Currently at [number] signups, [number] paying. If you're ahead of that,
> please tell me what you're doing differently.
>
> Happy to answer specifics rather than give you a vague playbook.

**Why it works:** nobody trusts a success story that hides the failures. This
format gets upvoted _and_ generates follow-up questions you can answer for free.

---

## 10. "What's your tech stack?" (r/programming, r/webdev)

**Angle:** Answer honestly, technically. Don't pitch.

**Draft:**

> Next.js 16 (App Router), TypeScript, Prisma, Neon Postgres, Upstash Redis for
> cache and rate limits, Tinybird for click analytics, Inngest for background
> jobs, Cloudflare R2 for storage, Polar for billing, Sentry, Vercel to host.
>
> The one decision worth arguing about: **why Tinybird over ClickHouse
> directly.**
>
> ClickHouse is the better database for this. Tinybird is SQL-flavored ClickHouse
> with pre-built API endpoints, so I got the write path and query path handled
> without writing an API layer. That's a real productivity win for a solo
> project, and it costs some query flexibility.
>
> Full disclosure: it's my own project, MIT licensed if you'd rather read the
> code than take my word for it.

---

## 11. Reply-to-a-challenge

Someone pushes back: _"your tool is just X with a worse UI"_

**Angle:** Concede genuinely, then offer the one real difference. Never defend
product.

**Draft:**

> Fair, and the UI is worse, no argument there.
>
> The actual difference is [one specific, verifiable thing — self-hosting,
> > open source, a feature they lack, pricing at your volume].
>
> If [their stated need] is all you need, don't switch. [Competitor] is
> genuinely better at [specific thing].

**Never:** get defensive, argue specs, or call them wrong. You will lose the
thread and possibly the sub.

---

## 12. "Why did you build this?"

**Angle:** The founder story. Best format on r/buildinpublic.

**Draft:**

> Short version: I kept needing link tracking and kept being annoyed by it.
>
> [Specific concrete frustration — pricing, export limits, wanting the data in
> > my own DB.]
>
> I looked for an existing tool that did [the specific thing]. Didn't find one
> that did all of it, so I built it and open sourced it in case it saves someone
> else the weekend.
>
> Genuinely open to being told I'm solving a problem nobody has — that's useful
> information too.

---

## Reply-to-a-thanks

Someone says thanks. **Do not pitch the follow-up.**

**Draft:**

> Happy to help. Good luck with it.

That's it. Asking "want a link?" after a thank-you is the single most common
way good comment threads get turned into removal incidents.

---

## Phrases that get you removed

| Never write                                     | Why                                          |
| ----------------------------------------------- | -------------------------------------------- |
| "Check out my profile!"                         | Transparent pitch                            |
| "I built X — here's the link:" in a comment     | Comment + link = removal                     |
| "Great post! Check out [link]"                  | Astroturfing, heavily policed                |
| Same comment text in multiple threads           | Dupe content signal                          |
| "Btw I also built..."                           | Unprompted promotion                         |
| "DM me for details"                             | Unwanted DM reports                          |
| "Would you like me to write a post about this?" | Implies you're building an outreach campaign |

---

## Phrases that earn upvotes

- "Full disclosure: I build this."
- "That's the wrong question — it depends on [X]."
- "The mistake most people make here is [X]."
- "Honest caveat: [limitation]."
- "You might be better off not switching. Here's how to tell:"
- "Full numbers below, including the ones that make me look bad:"
- "Full disclosure: I run one of these, so I'm not neutral."

That last one — volunteering your bias before anyone asks — is disproportionately
effective. It removes the accusation of astroturfing, which is the thing people
are actually looking for when they suspect a comment.
