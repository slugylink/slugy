# Reddit Playbook for Slugy

**Owner:** @slugydotco account
**Product:** slugy.co — open-source link management (MIT)
**Repo:** https://github.com/slugylink/slugy
**Status:** Organic only. No Reddit ads.
**Last reviewed:** 2026-10-01

---

## 1. The rule that overrides everything else

### Never post a `slugy.co` short link

Reddit's spam filter blocks URL-shortener domains **sitewide**. This is not a
subreddit setting a moderator can toggle — moderators have explicitly noted
they cannot approve these removals. Many share buttons on other platforms
shorten by default, which is why so many accounts trip this accidentally.

**What this means for Slugy specifically:**

| Do                                    | Don't                                              |
| ------------------------------------- | -------------------------------------------------- |
| Post `slugy.co/pricing` (a real page) | Post `slugy.co/aB3xK9` (a redirect)                |
| Put the full URL in the post **body** | Put any link in the post **title**                 |
| Link `github.com/slugylink/slugy`     | Run a slugy.co short link as the submission URL    |
| Let readers find your profile         | Ask people to visit a specific slugy.co short link |

A bare domain with a path is not a redirect and does not trip the filter. A
short link is a redirect and does.

**This single constraint invalidates most generic Reddit marketing advice**,
including the "we write the post, you paste it" model sold by tools like
mediafa.st. Those services have no way to know a product is a shortener, so
their drafts get auto-removed before a human sees them.

### Verify this yourself first

> **Do this before writing a single post.** Open `slugy.co` in a browser, copy
> a real short link from your app, and submit it to a low-stakes subreddit that
> allows self-promotion. If it survives, Reddit has not classified your domain.
> If it's auto-removed, you need a different routing strategy entirely and this
> playbook's assumptions change.

Do not run this test on your main account. Use a throwaway account or skip the
test and simply never post short links — that is the safe default.

---

## 2. Ban-safety rules card

Post this section where you can see it while writing. These are the rules that
actually get accounts removed.

### Sitewide — permanent suspension risk

- **No alt accounts / sockpuppets.** Never upvote your own content, never post
  fake recommendations from a second account, never have a "friend" account
  agree with you. Reddit actively detects this. Permanent sitewide ban, often
  including IP bans.
- **No vote manipulation or brigading.** Never share a Reddit link on X, LinkedIn,
  Discord, or email with the intent of driving upvotes.
- **Never ask for upvotes.** Not in the post, not in a comment, not in your
  profile.
- **No ban evasion.** Don't post the same removed content after a removal.
- **No automated posting.** Bots, schedulers, and browser-automation tools get
  accounts banned. You press publish. Every time.
- **No unsolicited DMs pitching.** Ever. This is the fastest route to a ban
  people don't recover from.

### Per-subreddit — read before every post

- **Read the sidebar and rules before you type anything.** This takes 30 seconds
  and prevents the large majority of bans. Rules change without notice.
- **Post-promotion is opt-in, never opt-out.** Absence of a promo rule does not
  mean promo is welcome.
- **Respect the designated day/thread.** If the sub has a "Self-Promo Saturday"
  or a monthly megathread, that is the only sanctioned slot.
- **Message the mods before posting.** For any non-obvious post, modmail first.
  A one-line "planning to post X, is that okay?" gets more posts approved than
  silence ever will.
- **If a post gets removed, do not repost.** Read why, adjust, move on. Arguing
  with a mod is the fastest way to a sub ban.

### The 90/10 rule

Not an official Reddit rule — it's reddiquette convention — but many mods
enforce it directly. Roughly 10% of your Reddit activity may be self-promotional.

Some subs enforce far stricter (99/1). Track it:

```
Weekly check:
  Total actions this week:        ___
  Promotional actions:             ___
  Ratio:                           ___%
  Target:                          < 10%
```

**A promotion** = post featuring Slugy, comment naming Slugy or linking to it,
comment answering a link/shortener question where Slugy comes up.

**Not a promotion** = genuine answers, asking for feedback on your product's
UX, upvotes on others' posts, participating in unrelated threads, modmail.

### Mandatory disclosure

Every single time you mention Slugy, in any format:

> "Full disclosure: I built Slugy."

Not hedging. Not "I may have built something like this." Not a vague
"we" without context. Undisclosed promotion is treated as deception, which is
a far more serious violation than promotion itself.

Link in profile: `slugy.co` as a brand/social link, plus
`github.com/slugylink/slugy`. Both are full URLs, neither is a redirect.

---

## 3. Target subreddit matrix

> ### ⚠️ UNVERIFIED — read before relying on this
>
> **These rules could not be verified against live Reddit.** Reddit blocks
> automated access from our servers (HTTP 403, "blocked by network security"),
> and no browser session was available. Everything below comes from dated
> secondary sources that **contradict each other**.
>
> Confidence markers:
>
> - 🟢 **High** — multiple sources agree, rule is long-standing and well known
> - 🟡 **Medium** — single source, may be stale
> - 🔴 **Unconfirmed** — do not act on this without checking
>
> **Confirm any sub's policy in-app before your first post there.** This is step
> one of the daily checklist below, not an optional nicety.

### Primary targets

| Sub               | Audience fit                          | Promo policy                                                                | Conf | Where to post                                                         |
| ----------------- | ------------------------------------- | --------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| `r/selfpromotion` | Founders explicitly looking for tools | Dedicated, by design                                                        | 🟢   | Weekly stickied megathread. Read its rules for the title/body format. |
| `r/buildinpublic` | Founders sharing journey              | Allowed with conditions; "no self-promo without context"                    | 🟡   | Build-in-public posts with real numbers. Context is the whole post.   |
| `r/SaaS`          | SaaS founders                         | **No promotion.** Rule 11 bans promo, recommendations, launch announcements | 🟢   | **Comments only.** Never a post.                                      |
| `r/Entrepreneur`  | Broad founder/buyer pool              | Mixed; self-promo widely tolerated in comments                              | 🟡   | Comments. Posts only with modmail approval.                           |
| `r/indiehackers`  | Indie builders                        | Generally welcoming                                                         | 🟡   | Launch/lessons posts. Verify first.                                   |
| `r/selfhosted`    | Self-hosters                          | **Strictly no promotion**                                                   | 🟡   | Comments only, and only when the thread is about self-hosting links.  |

### Secondary targets

| Sub             | Audience fit           | Promo policy                                        | Conf | Notes                                                |
| --------------- | ---------------------- | --------------------------------------------------- | ---- | ---------------------------------------------------- |
| `r/nocode`      | Non-technical builders | Megathread or set day only                          | 🟡   | Bio links / QR features are the angle                |
| `r/analytics`   | Data practitioners     | Technical discussion                                | 🟡   | Tinybird click-analytics deep-dive. Zero promo tone. |
| `r/webdev`      | Developers             | "No self-promotion" / "no commercial solicitations" | 🟡   | Comments only                                        |
| `r/marketing`   | Marketers              | Varies by thread                                    | 🔴   | Verify individually                                  |
| `r/microsaas`   | Small SaaS             | "No low-effort self-promotion"                      | 🟡   | Quality bar is real. Effortless posts get removed.   |
| `r/opensource`  | OSS projects           | Project showcases permitted                         | 🟡   | Strong fit for Slugy's MIT license                   |
| `r/privacy`     | Privacy-conscious      | Hostile to tracking products                        | 🔴   | Only viable as self-hosting discussion               |
| `r/programming` | General dev            | No promo                                            | 🟢   | Comments only, technical answers                     |

### Subs to avoid entirely

- **`r/promotedisabled`** — exists specifically to catch advertisers. Getting
  removed here is a strong signal that follows you.
- **`r/Hive`** — marketing-focused, aggressively moderated against stealth promo.
- **`r/gaming`, `r/gamingsuggestions`** — no product fit, rules ban self-promo.
- **`r/justforwards`** — link-forwarding only, no product discussion.
- **Any sub whose rules you have not read in the last 30 days.**

### What "Medium" confidence actually means here

Secondary aggregators (blog posts ranking subreddit lists) were frequently
2-3 years stale or simply wrong. `r/webdev` in particular is described
differently across sources. Treat 🟡 and 🔴 as "unknown until you check."

---

## 4. Comment-first protocol — weeks 1 and 2

You have an account with real karma and prior posting history, so skip the
cold-start warm-up entirely. Go straight to comments.

**Comments work immediately; posts need 2-3 weeks of karma behind them.** Weeks
1-2 are for pure comments. No posts at all.

### Week 1 goal

- 5-7 comments per day, every one genuinely useful
- 0 posts
- Zero mention of Slugy unless someone directly asks and the answer is relevant

### Week 2 goal

- 5-7 comments per day
- Mention Slugy in at most 2-3 of them, only where it genuinely answers the question
- 1 low-risk post in the safest available slot (`r/selfpromotion` megathread)

### Why comments convert better than posts early

1. They work immediately — no karma gate.
2. They rank on Google for years. A good answer to "best URL shortener for
   startups" keeps sending people to that thread long after you post it.
3. ChatGPT, Claude and Perplexity read Reddit to answer tool questions. A
   substantive comment gets scraped into those answers — that's the compounding
   channel MediaFast's third section is selling, and it costs nothing but
   consistency.
4. Zero removal risk if you don't link anything.

### The reply speed advantage

If someone asks "anyone know a good Bitly alternative?" and you reply in 20
minutes, you get the customer. Reply at day four and you get nothing — the
thread has moved on and ten other vendors already answered. Set up alerts:

- Reddit search: `bitly alternative`, `url shortener`, `link shortener`,
  `dub.co alternative`, `shorten links`
- Sort by **New**, check morning and evening
- 10 minutes a day, non-negotiable

---

## 5. Daily checklist — 10 minutes

**Morning (3 min)**

1. Check alerts for new high-intent threads. Reply first.
2. Shadowban check (see §6) if you have not done it this week.

**Posting window (5 min)** 3. Before posting anywhere: read that sub's sidebar + rules. Every time. 4. Confirm your action keeps you under 10% promotional for the week. 5. Post or comment — manually. Then close the tab.

**Evening (2 min)** 6. Log what you did in `.socials/posts.md`. 7. Reply to any replies on your own posts. This is what compounds.

---

## 6. Shadowban detection

A shadowban makes your content invisible to everyone else while it still looks
normal to you. **Reddit does not notify you.** You can market into a void for
weeks.

### Weekly test

1. Comment on a popular thread in a large, lightly moderated sub with something
   clearly useful.
2. Note the timestamp.
3. Wait 15-30 minutes.
4. Log out of Reddit entirely (incognito, or a different browser).
5. View the thread. **Is your comment visible?**

If it's missing while still visible when logged in, you're shadowbanned. Stop
all promotional activity immediately.

### Recovery

1. Stop posting for 3-5 days. No links at all.
2. Return with genuine comments only — no mentions, no links.
3. Re-test after a week.
4. If it persists after two weeks of clean behavior: appeal via
   https://support.reddithelp.com and reduce volume further.

### Prevention

Shadowbans almost always trace back to: link-dropping without context,
identical comments across multiple threads, too many links in too short a
period, or the same post hitting many subs at once.

---

## 7. What not to do

| Tempting                                  | Why it fails                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| Post the same content to 5 subs           | Coordinated-spam signal. Permanent sitewide ban risk.                           |
| Crosspost a slugy.co short link           | Filter-blocked. Invisible failure.                                              |
| Paste a canned comment template           | Reddit detects AI-formatted replies; mods remove the whole history.             |
| Comment with a link on every mention      | Single biggest removal trigger.                                                 |
| Post "we just launched Slugy!"            | Launch-announcement format is banned or heavily restricted in most target subs. |
| Recruit other founders to upvote          | Vote manipulation. Permanent ban.                                               |
| Automate posting via a scheduler          | Automated posting gets accounts banned.                                         |
| Argue after a removal                     | Fastest route to a sub ban.                                                     |
| Create a second "non-promotional" account | Sockpuppet. Worst possible move.                                                |

---

## 8. Metrics

### Weekly dashboard

```markdown
| Week | Comments | Promotional % | Posts | Removed | Signups (UTM) | Threads ranking on page 1 |
| ---- | -------- | ------------- | ----- | ------- | ------------- | ------------------------- |
| 1    | 35       | 3%            | 0     | 0       | ?             | 0                         |
```

### What actually predicts revenue

Ranked by signal value:

1. **Threads ranking on page 1 of Google.** This is the compounding asset. One
   good answer to a tool question generates signups for 12+ months. Track your
   thread URLs monthly.
2. **ChatGPT / Perplexity mentions.** Ask monthly: "what's the best open-source
   URL shortener?" Note whether Slugy appears. This improves passively as more
   threads rank.
3. **UTM-tagged signups.** Use Slugy's own UTM builder. Every link you share gets
   `?utm_source=reddit&utm_medium=organic&utm_campaign=<sub>`. Note: use **full
   URLs only** — see §1.
4. **Comment upvote count.** Target 5+ average per helpful comment.
5. **GitHub stars from Reddit.** Secondary signal, but real.

### Vanity metrics — ignore these

- Total karma
- Impressions
- Upvote ratio alone (a removed-then-reapproved post can look great and reach
  nobody)

### Honest timeline

| Window    | Realistic expectation                                                            |
| --------- | -------------------------------------------------------------------------------- |
| Week 1    | Comments landing, no traffic yet. Zero signups is normal.                        |
| Week 2    | First profile visits. A handful of signups possible.                             |
| Weeks 3-4 | Posts start reaching front pages. Threads begin ranking on Google. Real traffic. |
| Month 2+  | Compounding. Old threads keep working. This is where it's worth it.              |

**This will not produce 100 customers in a week.** It is 5-10 minutes a day,
sustained for a month or more. Founders who post twice and quit get nothing.
That is the actual mechanism, and it's the reason it works — the consistency is
the moat against competitors who won't do it.

---

## 9. Angle: lead with open source

Per strategy decision, every post and most comments lead with the MIT license
and self-hostability.

Why this is the strongest card Slugy holds:

1. **Highest possible trust.** "MIT, self-host it, audit the code" converts
   skeptical devs where a signup link repels them.
2. **It sidesteps the short-link problem.** GitHub is never filter-blocked.
3. **It fits the communities most receptive to you** — `r/selfhosted`,
   `r/indiehackers`, `r/opensource`.
4. **It's genuinely true.** Don't oversell it. Repo is public, 92 stars,
   15 forks, MIT licensed, actively pushed (last commit 2026-09-30).
5. **Self-hosters become contributors and evangelists**, which is worth more
   than the signups they don't convert.

Frame: _"I built an open-source link shortener that you can self-host, or use
hosted for free."_ Never _"Try my startup."_

---

## 10. Escalation

**Post removed:** read the rule, note it, don't repost. Add it to §3.
**Sub ban:** respect it permanently. Message the mod once, professionally, then
move on.
**Sitewide suspension:** stop all Reddit activity. Appeal at
https://support.reddithelp.com. Full stop until resolved.

**The one non-negotiable:** if you get suspended, do not create a new account to
continue. That converts a recoverable situation into a permanent one, and it's
how accounts get IP-banned.
