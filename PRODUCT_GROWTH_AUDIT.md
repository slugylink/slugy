# Slugy: Product and Growth Audit

Slugy does not mainly lack features—it lacks a focused reason for a specific person to choose it.

You already have a strong core: branded short links, custom domains, QR codes, analytics, link-in-bio, teams, API keys, lead tracking, and UTM/referrer data. The gap is turning those capabilities into a clear product story and repeatable acquisition loop.

Your six audience cards are a good research start, but they are too broad to market to all at once.

| Priority | What’s missing             | Why it matters                                                                                                                                                      |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | One primary customer       | “For everyone who needs links” loses to Bitly/Linktree. Pick one narrow wedge first.                                                                                |
| 2        | Outcome-led use-case pages | Make pages such as “QR tracking for event organisers” or “Branded campaign links for agencies,” each with its own demo, template, proof, and CTA.                   |
| 3        | Social proof               | The landing page needs real customer logos, short testimonials, case studies, and concrete results. Do not use invented growth charts or vague numbers as proof.    |
| 4        | Fast tailored activation   | After a user selects a use case, create their first useful asset automatically: campaign link, QR code, bio page, or client workspace.                              |
| 5        | Templates                  | “Create from template” is much easier than starting on an empty dashboard. Examples: UTM campaign builder, event QR poster, agency client report, launch link pack. |
| 6        | Distribution engine        | SEO comparison/use-case content, partner referrals, creator demos, and public shareable pages will bring users repeatedly.                                          |

## Recommended starting audience: marketing agencies

Start with **marketing agencies**, not all six segments. They can bring multiple client workspaces, pay for teams/custom domains, care about reporting, and recommend tools to clients. Slugy already supports much of their workflow.

### Sharper homepage message

> Branded campaign links, QR codes, and client-ready analytics for small marketing teams.
>
> Launch a tracked campaign in minutes—without enterprise link-management pricing.

Make the main call to action:

> Create your first campaign link

Instead of the generic “Get Started.”

## Highest-value additions

1. Campaign templates with pre-filled UTM naming rules.
2. Bulk link creation and import for agency campaigns.
3. Shareable branded client reports, available as a public link or scheduled email.
4. Link alerts, such as “this campaign crossed 1,000 clicks” or “destination is broken.”
5. Integrations and webhooks for Zapier, Make, Google Sheets, and Slack.
6. A referral reward: extra tracked links, domains, or a month of Pro for each paying referral.

## Turn audience cards into acquisition pages

The cards should not only be internal personas or decorative content. Each should become a real landing page with:

- A headline tied to that persona’s job and result.
- One 30–60 second workflow demo.
- Relevant templates.
- A recognizable customer example or case study.
- One focused call to action.

Example page: **Campaign link management for marketing agencies**

- Headline: “Give every client campaign a branded, trackable link.”
- Demo: Create a UTM-tagged link, generate a QR code, and share a client report.
- CTA: “Create a client campaign.”

## Fix the current audience-card presentation

- Avoid unverified market-size circles such as `4.5K` and `12.0K`, unless users can understand exactly what they measure and where the numbers come from.
- Replace generic criteria with customer language collected from interviews.
- Make every persona card link to its dedicated use-case page.
- Do not market to all six audiences equally; lead with one and keep the others as later expansion paths.

## Immediate next move

Choose one audience, interview ten people in it, and learn which single moment makes them say: “I need this now.” Build the landing page, onboarding, template, and outreach around that moment.

In PRODUCT_GROWTH_AUDIT.md, the thesis is:
You don't lack features. You lack a focused reason for a specific person to choose Slugy over Bitly / Linktree.
You already have: branded links, custom domains, QR, analytics, link-in-bio, teams, API keys, lead tracking, UTM/referrer.
Here's what is missing, checked against your current code:

1. Pick ONE primary customer - NOT DONE
   Audit says: lead with marketing agencies first, keep other 5 segments for later.
   They bring multi-client workspaces, pay for teams/domains, need reporting.
   Currently: hero.tsx:27,48,122 is still generic:
   Short Links with Powerful Analytics + Get Started
   Needs to become:
   Branded campaign links, QR codes, and client-ready analytics for small marketing teams.
   CTA: Create your first campaign link
2. Outcome-led use-case pages - NOT DONE
   No /for-agencies, /for-events, etc. pages exist. Only generic /, /pricing, /blogs, /custom-domain.
   Each persona needs its own page with:

- persona-specific headline + result
- 30-60s workflow demo
- relevant templates
- 1 customer example
- 1 focused CTA e.g. Create a client campaign
  Example to build first: Campaign link management for marketing agencies

3. Social proof - NOT DONE
   Landing has Stats, Sponsors, VideoDemo, but audit warns:
   Do not use invented growth charts or vague numbers.
   Need: real logos, short testimonials, case studies with concrete results.
4. Fast tailored activation - NOT DONE
   src/components/web/\_onboarding/use-case-form.tsx only does saveOnboardingUseCase(selected) then pushes to /onboarding/create-workspace.
   It does NOT auto-create the first useful asset based on use-case: campaign link / QR / bio page / client workspace.
5. Templates - NOT DONE
   No Create from template. Need:

<!-- - UTM campaign builder -->

- event QR poster
- agency client report
- launch link pack
<!-- - campaign templates with pre-filled UTM naming rules -->

6. Highest-value additions - ALL MISSING
   Checked in src/:
   <!-- 1. Bulk link creation + import - you only have bulk delete api/.../link/delete and bulk archive, no bulk create / CSV import. -->
   <!-- 1. Shareable branded client reports - public link or scheduled email - not found. -->
1. Link alerts - crossed 1,000 clicks / destination broken - not found, only UI alert.tsx.
1. Integrations + webhooks - only polar/webhook for billing. No Zapier, Make, Google Sheets, Slack outgoing.
1. Referral reward - extra links / domains / Pro month - not found.
1. Campaign templates - see #5.
1. Fix audience-card presentation

- Remove unverified 4.5K / 12.0K circles unless source is clear
- Replace generic criteria with real interview language
- Every card must link to its dedicated use-case page
- Don't market 6 audiences equally

8. Distribution engine - NOT DONE
   Need: SEO comparison/use-case content, partner referrals, creator demos, public shareable pages (reports, bio pages).
   Immediate next move per audit:
   Pick agencies, interview 10 people, find the I need this now moment, then build landing + onboarding + template + outreach around that.
   Want me to prioritize these into an implementation order starting with the agency landing + CTA + onboarding auto-create?
