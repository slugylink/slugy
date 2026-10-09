// Platform presets + page content in one place so chips and pages never drift.

export interface PlatformPreset {
  /** Stable key used in the builder chips. */
  key: string;
  /** Short chip label. */
  label: string;
  /** Slug under /tools/utm-builder. */
  slug: string;
  /** Page <h1>/title subject, e.g. "Google Ads". */
  name: string;
  /** Default parameter values the chip applies. */
  values: {
    source: string;
    medium: string;
    campaign: string;
    term: string;
    content: string;
  };
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    key: "google-ads",
    label: "Google Ads",
    slug: "google-ads",
    name: "Google Ads",
    values: {
      source: "google",
      medium: "cpc",
      campaign: "spring-launch",
      term: "url-shortener",
      content: "search-ad-a",
    },
  },
  {
    key: "facebook",
    label: "Meta Ads",
    slug: "facebook",
    name: "Meta (Facebook & Instagram)",
    values: {
      source: "facebook",
      medium: "paid_social",
      campaign: "retargeting-q4",
      term: "lookalike-1pct",
      content: "carousel-a",
    },
  },
  {
    key: "tiktok",
    label: "TikTok",
    slug: "tiktok",
    name: "TikTok",
    values: {
      source: "tiktok",
      medium: "paid_social",
      campaign: "creator-spark",
      term: "broad",
      content: "ugc-video-a",
    },
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    slug: "linkedin",
    name: "LinkedIn",
    values: {
      source: "linkedin",
      medium: "paid_social",
      campaign: "demand-gen-q4",
      term: "job-title-managers",
      content: "single-image-a",
    },
  },
  {
    key: "email",
    label: "Email",
    slug: "email",
    name: "Email",
    values: {
      source: "newsletter",
      medium: "email",
      campaign: "weekly-digest",
      term: "",
      content: "header-cta",
    },
  },
  {
    key: "ga4",
    label: "GA4 Audit",
    slug: "ga4",
    name: "GA4",
    values: {
      source: "audit",
      medium: "referral",
      campaign: "channel-audit",
      term: "",
      content: "row-a",
    },
  },
];

export interface PlatformPage {
  slug: string;
  /** Short platform name used in headings and links, e.g. "Google Ads". */
  name: string;
  /** Meta title (template adds "| Slugy"). */
  title: string;
  description: string;
  keywords: string[];
  /** H1 + intro shown above the seeded builder. */
  heading: string;
  intro: string;
  /** What each parameter should be on this platform. */
  convention: Array<{ param: string; value: string; why: string }>;
  /** Platform-specific gotchas worth their own section. */
  notes: Array<{ heading: string; body: string }>;
  examples: Array<{ label: string; url: string }>;
  faq: Array<{ q: string; a: string }>;
}

export const PLATFORM_PAGES: PlatformPage[] = [
  {
    slug: "google-ads",
    name: "Google Ads",
    title: "Google Ads UTM Builder — Tag Campaign URLs Correctly",
    description:
      "Free Google Ads UTM builder, no login. Tag search, Performance Max and YouTube campaigns with utm_source=google, utm_medium=cpc and keyword-aware utm_term.",
    keywords: [
      "google ads utm builder",
      "google ads utm parameters",
      "utm for google ads",
      "google ads campaign url",
      "gclid vs utm",
    ],
    heading: "Google Ads UTM Builder",
    intro:
      "Build tracked URLs for Google Ads campaigns with the conventions GA4 expects: google as the source, cpc as the medium, and the keyword in utm_term. Pre-seeded below — swap in your campaign name and go.",
    convention: [
      {
        param: "utm_source",
        value: "google",
        why: "Keep it lowercase and exactly `google` so ads never split into a separate GA4 row.",
      },
      {
        param: "utm_medium",
        value: "cpc",
        why: "`cpc` is the conventional medium for paid search. Use `display` for display campaigns so they stay distinguishable.",
      },
      {
        param: "utm_campaign",
        value: "your-campaign-name",
        why: "Reuse the campaign name from Google Ads so reporting reconciles without a lookup table.",
      },
      {
        param: "utm_term",
        value: "keyword",
        why: "Holds the matched keyword. Many accounts rely on auto-tagging (gclid) instead — if so, leave this empty and read keywords from Google Ads.",
      },
      {
        param: "utm_content",
        value: "ad-variant-a",
        why: "Distinguish creatives or ad groups within the same campaign for A/B reporting.",
      },
    ],
    notes: [
      {
        heading: "Auto-tagging (gclid) vs manual UTMs",
        body: "Google Ads auto-tagging appends a gclid, which GA4 reads directly. Manual UTMs are still useful when you send the same URL to Google Ads and another channel, or when a tool ignores gclid. If you use both, keep the UTMs lowercase and consistent so GA4 does not create duplicate rows.",
      },
      {
        heading: "Final URL suffix vs the landing page URL",
        body: "You can paste UTMs into the Final URL, but the cleaner approach is the account, campaign, or ad-group 'Final URL suffix' field — you set the tags once and every ad inherits them. Set `utm_source=google&utm_medium=cpc` at the account level and override the campaign tag per campaign.",
      },
      {
        heading: "Watch the redirect to your landing page",
        body: "If your ad points at a shortened link, the redirect must forward the query string. Slugy forwards UTMs from the short link onto the destination, so click-time tags survive the hop.",
      },
    ],
    examples: [
      {
        label: "Paid search, keyword-level term",
        url: "https://example.com/pricing?utm_source=google&utm_medium=cpc&utm_campaign=spring-launch&utm_term=url-shortener&utm_content=search-ad-a",
      },
      {
        label: "Performance Max (no keyword)",
        url: "https://example.com/pricing?utm_source=google&utm_medium=cpc&utm_campaign=pmax-q4&utm_content=asset-group-2",
      },
    ],
    faq: [
      {
        q: "Should I use UTMs with Google Ads auto-tagging?",
        a: "You can, but avoid conflicting with gclid. Auto-tagging alone gives GA4 full Google Ads data. Add UTMs when the same link is used outside Google Ads or when a platform does not accept gclid. Keep values lowercase so rows do not split.",
      },
      {
        q: "What should utm_medium be for Google Ads?",
        a: "Use `cpc` for Search, Shopping and Performance Max. Use `display` for display campaigns and `video` for YouTube so each surface stays separately reportable.",
      },
      {
        q: "Do I need utm_term on Google Ads?",
        a: "Only for paid search where you want the keyword in the URL. Dynamic keyword insertion is available via {keyword} in Google's tracking template, but it is fragile — explicit UTMs are more reliable.",
      },
      {
        q: "Why are my Google Ads clicks showing as 'google / cpc' and something else?",
        a: "Usually a casing or whitespace mismatch (Google vs google, cpc vs CPC). This builder lowercases and slugifies values automatically so GA4 groups them into one row.",
      },
    ],
  },
  {
    slug: "facebook",
    name: "Meta",
    title: "Facebook & Instagram UTM Builder — Meta Ads Tracking",
    description:
      "Free Meta ads UTM builder, no login. Tag Facebook and Instagram campaigns with utm_source, paid_social medium and creative-level utm_content.",
    keywords: [
      "facebook utm builder",
      "instagram utm builder",
      "meta ads utm",
      "facebook ads utm parameters",
      "paid social utm",
    ],
    heading: "Meta Ads UTM Builder (Facebook & Instagram)",
    intro:
      "Tag Facebook and Instagram campaigns so paid social is separable from organic in GA4. Pre-seeded with Meta conventions — separate the two placements with utm_source, and label the creative with utm_content.",
    convention: [
      {
        param: "utm_source",
        value: "facebook or instagram",
        why: "Split the placements so a feed ad and a Reels ad never collapse into one row. Use `meta` only if you never need them apart.",
      },
      {
        param: "utm_medium",
        value: "paid_social",
        why: "Distinguishes paid from organic social in the same report. `cpc` also works but lumps Meta in with search.",
      },
      {
        param: "utm_campaign",
        value: "retargeting-q4",
        why: "Mirror the Meta campaign name for one-to-one reconciliation.",
      },
      {
        param: "utm_term",
        value: "audience",
        why: "Name the audience or targeting cluster (lookalike-1pct, interest-yoga) to compare performance by segment.",
      },
      {
        param: "utm_content",
        value: "creative-variant",
        why: "The single most useful Meta dimension: which creative actually won. Name the ad or variant.",
      },
    ],
    notes: [
      {
        heading: "fbclid is not a substitute for UTMs",
        body: "Meta appends fbclid automatically, but it only survives when your destination is reachable from Meta's crawler and the user allows it. For reliable GA4 reporting across placements and audiences, add explicit UTMs.",
      },
      {
        heading: "Organic vs paid in one account",
        body: "If you post organically and run ads from the same handle, utm_medium is what keeps them apart. Organic posts should not carry a paid medium — use `social` for organic and `paid_social` for ads.",
      },
      {
        heading: "Placement-level naming",
        body: "Meta's Advantage+ placements blend Feed, Stories, Reels and Audience Network. If you need placement reporting, either split campaigns by placement or encode it in utm_content (e.g. reels-ugc-a).",
      },
    ],
    examples: [
      {
        label: "Facebook retargeting carousel",
        url: "https://example.com/sale?utm_source=facebook&utm_medium=paid_social&utm_campaign=retargeting-q4&utm_term=cart-abandoners&utm_content=carousel-a",
      },
      {
        label: "Instagram Reels UGC",
        url: "https://example.com/sale?utm_source=instagram&utm_medium=paid_social&utm_campaign=creator-spark&utm_term=lookalike-1pct&utm_content=reels-ugc-b",
      },
    ],
    faq: [
      {
        q: "What utm_source should Meta ads use?",
        a: "Use `facebook` for Facebook placements and `instagram` for Instagram so each is reportable on its own. Use `meta` only when you deliberately want the two combined and never need them split.",
      },
      {
        q: "Is utm_medium=cpc or paid_social better for Facebook?",
        a: "`paid_social` is more descriptive and keeps paid social separate from paid search in GA4. `cpc` is acceptable but mixes Meta with Google and Microsoft ads.",
      },
      {
        q: "Why does my Facebook traffic show as 'facebook / referral'?",
        a: "That means the destination received no UTM tags and GA4 fell back to the referrer. Adding explicit UTMs moves the traffic into the campaign reports.",
      },
      {
        q: "Should Instagram and Facebook share a campaign name?",
        a: "Keep the Meta campaign name identical for easy reconciliation, then use utm_source or utm_content to separate placements and creatives.",
      },
    ],
  },
  {
    slug: "tiktok",
    name: "TikTok",
    title: "TikTok UTM Builder — Tag TikTok Ads & Creators",
    description:
      "Free TikTok UTM builder with no login. Tag TikTok ad campaigns and creator posts with utm_source=tiktok, paid_social medium and creative-level utm_content.",
    keywords: [
      "tiktok utm builder",
      "tiktok ads utm",
      "tiktok campaign url",
      "tiktok paid social tracking",
    ],
    heading: "TikTok UTM Builder",
    intro:
      "Track TikTok ads, Spark Ads and creator collaborations separately. Pre-seeded for TikTok with creative-level tagging so you can tell which video actually drove the click.",
    convention: [
      {
        param: "utm_source",
        value: "tiktok",
        why: "One consistent source keeps TikTok in a single GA4 row. Use `tiktok-organic` vs `tiktok` if you need to split paid from organic.",
      },
      {
        param: "utm_medium",
        value: "paid_social",
        why: "Separates TikTok ads from search and from other social platforms. `cpc` also works if all your paid traffic uses cpc.",
      },
      {
        param: "utm_campaign",
        value: "creator-spark",
        why: "Match the TikTok Ads Manager campaign so the two systems agree.",
      },
      {
        param: "utm_term",
        value: "audience",
        why: "Name the targeting cluster (broad, interest-beauty) for segment comparison.",
      },
      {
        param: "utm_content",
        value: "creative-id",
        why: "TikTok is creative-led — encode the video or Spark creator here to see which creative converts.",
      },
    ],
    notes: [
      {
        heading: "Spark Ads and creator posts",
        body: "When a creator posts with your link, use utm_source=tiktok and put the creator handle in utm_content (e.g. creator-anna). That separates a creator's organic post from your paid Spark boost of the same video.",
      },
      {
        heading: "Short links in bios and captions",
        body: "Long tagged URLs are unreadable in a caption. Build the tagged URL here, shorten it with Slugy, then post the short link — clicks still resolve with the UTMs forwarded to your destination.",
      },
      {
        heading: "In-app browser referrer loss",
        body: "TikTok's in-app browser often sends no Referer header, so GA4 shows 'Direct' unless UTMs are present. Explicit tags are the only reliable attribution inside the app.",
      },
    ],
    examples: [
      {
        label: "Paid Spark Ad",
        url: "https://example.com/app?utm_source=tiktok&utm_medium=paid_social&utm_campaign=creator-spark&utm_term=broad&utm_content=ugc-video-a",
      },
      {
        label: "Creator collaboration",
        url: "https://example.com/app?utm_source=tiktok&utm_medium=paid_social&utm_campaign=creator-spark&utm_term=lookalike&utm_content=creator-anna",
      },
    ],
    faq: [
      {
        q: "Does TikTok add UTMs automatically?",
        a: "No, but it does append ttclid and can pass a referrer. Neither is as reliable as explicit UTMs, especially in TikTok's in-app browser where referrers are often dropped entirely.",
      },
      {
        q: "What should utm_medium be for TikTok?",
        a: "Use `paid_social` for ads and Spark Ads, or `social` for unpaid creator posts. This keeps paid and organic TikTok traffic in separate report rows.",
      },
      {
        q: "How do I track which TikTok creative converted?",
        a: "Put the video or creator identifier in utm_content. GA4 then breaks down sessions and conversions per creative, which is the metric that matters on TikTok.",
      },
      {
        q: "Can I use a short link for TikTok?",
        a: "Yes, and you should. Build the tagged URL, shorten it with Slugy, and post the short link. Slugy forwards the UTM tags onto the destination on redirect.",
      },
    ],
  },
  {
    slug: "linkedin",
    name: "LinkedIn",
    title: "LinkedIn UTM Builder — Tag LinkedIn Ads & Posts",
    description:
      "Free LinkedIn UTM builder, no login. Tag LinkedIn ads and organic posts with utm_source=linkedin, paid_social medium and audience-level utm_term.",
    keywords: [
      "linkedin utm builder",
      "linkedin ads utm",
      "linkedin campaign url",
      "linkedin paid social tracking",
    ],
    heading: "LinkedIn UTM Builder",
    intro:
      "Separate LinkedIn paid campaigns from organic posts and compare performance by audience. Pre-seeded for LinkedIn with audience-level tagging for B2B reporting.",
    convention: [
      {
        param: "utm_source",
        value: "linkedin",
        why: "Keeps every LinkedIn touchpoint in one row. Use `linkedin-ads` if you want paid isolated at the source level instead of the medium.",
      },
      {
        param: "utm_medium",
        value: "paid_social",
        why: "The cleanest split between paid campaigns and organic company-page posts (use `social` for organic).",
      },
      {
        param: "utm_campaign",
        value: "demand-gen-q4",
        why: "Mirror the Campaign Manager campaign name for reconciliation.",
      },
      {
        param: "utm_term",
        value: "job-title-managers",
        why: "B2B targeting is the differentiator on LinkedIn — encode the audience so you can compare job titles, industries or seniorities.",
      },
      {
        param: "utm_content",
        value: "single-image-a",
        why: "Distinguish ad formats and creatives (single image, document ad, video) within one campaign.",
      },
    ],
    notes: [
      {
        heading: "Organic company posts need a different medium",
        body: "If your team posts and also runs ads, tag organic posts with `social` and ads with `paid_social`. Otherwise every LinkedIn session looks paid and your organic reach reporting disappears.",
      },
      {
        heading: "li_fat_id vs UTMs",
        body: "LinkedIn's conversion tracking appends li_fat_id for its own attribution. It is a click identifier, not a campaign label — GA4 still needs utm_source, utm_medium and utm_campaign to build campaign rows.",
      },
      {
        heading: "Document ads and Lead Gen Forms",
        body: "Lead Gen Forms do not send users to your site, so UTMs never fire for those leads. Tag the thank-you or follow-up destination instead if you route converters to your own URL.",
      },
    ],
    examples: [
      {
        label: "Demand gen, job-title targeting",
        url: "https://example.com/demo?utm_source=linkedin&utm_medium=paid_social&utm_campaign=demand-gen-q4&utm_term=job-title-managers&utm_content=single-image-a",
      },
      {
        label: "Organic company page post",
        url: "https://example.com/blog/link-tracking?utm_source=linkedin&utm_medium=social&utm_campaign=content-comms&utm_content=document-ad",
      },
    ],
    faq: [
      {
        q: "What utm_medium should LinkedIn ads use?",
        a: "`paid_social` for ads, `social` for organic company-page posts. That single choice keeps paid and organic LinkedIn traffic separated in GA4.",
      },
      {
        q: "How do I track LinkedIn audiences in GA4?",
        a: "Put the audience in utm_term (job-title-managers, industry-saas, seniority-director). GA4 then reports sessions and conversions per targeting cluster, which is how you find the audience worth scaling.",
      },
      {
        q: "Does LinkedIn auto-tagging replace UTMs?",
        a: "No. LinkedIn appends li_fat_id for its own conversion tracking. GA4 needs explicit campaign tags to group sessions into campaigns.",
      },
      {
        q: "Why do LinkedIn ads show up as 'linkedin / referral'?",
        a: "The destination received no UTM tags, so GA4 fell back to the referrer. Add utm_source=linkedin and utm_medium=paid_social to move those sessions into the campaign report.",
      },
    ],
  },
  {
    slug: "email",
    name: "Email",
    title: "Email UTM Builder — Tag Newsletters & Drips Correctly",
    description:
      "Free email UTM builder, no login. Tag newsletters, drips, and lifecycle emails with utm_source, email medium, and per-send utm_content for clean GA4 reports.",
    keywords: [
      "email utm builder",
      "newsletter utm parameters",
      "utm for email campaigns",
      "email campaign tracking url",
      "utm_content button tracking",
    ],
    heading: "Email UTM Builder",
    intro:
      "Attribute every send, drip, and lifecycle message with the conventions GA4 expects: your list as the source, email as the medium, and the button or banner in utm_content. Pre-seeded below — swap in your campaign and go.",
    convention: [
      {
        param: "utm_source",
        value: "newsletter",
        why: "Your list identifier (newsletter, onboarding, receipts). Keep one source per list so per-list performance stays comparable.",
      },
      {
        param: "utm_medium",
        value: "email",
        why: "Always `email` — GA4's default channel grouping keys off this value to file sessions under Email.",
      },
      {
        param: "utm_campaign",
        value: "weekly-digest",
        why: "The specific send or drip (weekly-digest, trial-day-3). Transactional messages like receipts get their own campaign so they never inflate newsletter numbers.",
      },
      {
        param: "utm_term",
        value: "",
        why: "Leave empty for email — term is for paid keywords and audiences, and an empty value keeps rows clean.",
      },
      {
        param: "utm_content",
        value: "header-cta",
        why: "The placement that earned the click (header-cta, hero-banner, footer). This is how you learn which block in the template converts.",
      },
    ],
    notes: [
      {
        heading: "One campaign per send, not per list",
        body: "Reuse the list in utm_source but mint a fresh utm_campaign per send or drip step. Otherwise every edition of the newsletter collapses into one row and you lose send-over-send comparison.",
      },
      {
        heading: "Apple Mail Privacy Protection inflates opens",
        body: "Since MPP, open rates are unreliable — prefetching counts as opens. Optimize email on clicks and downstream conversions (which UTMs measure exactly) instead of opens.",
      },
      {
        heading: "Plain-text vs HTML versions",
        body: "Both versions should carry identical UTMs so the send reports as one campaign. If your sender appends its own tags, check for duplicates before blaming GA4 for split rows.",
      },
    ],
    examples: [
      {
        label: "Weekly newsletter, header CTA",
        url: "https://example.com/blog/link-tracking?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest&utm_content=header-cta",
      },
      {
        label: "Trial drip, day 3",
        url: "https://example.com/pricing?utm_source=onboarding&utm_medium=email&utm_campaign=trial-day-3&utm_content=compare-plans",
      },
    ],
    faq: [
      {
        q: "What utm_medium should emails use?",
        a: "Always `email`. GA4's default channel rules file utm_medium=email sessions under the Email channel — any other value scatters them across Direct or Referral.",
      },
      {
        q: "Should transactional emails share the newsletter campaign?",
        a: "No. Give receipts and password resets their own utm_campaign (e.g. transactional-receipts) so service messages never inflate marketing numbers.",
      },
      {
        q: "Why does GA4 show my newsletter under Direct?",
        a: "Almost always missing or inconsistent tags — often a redirect (including a short link) stripping the query string. Verify the hop preserves UTMs; Slugy forwards them onto the destination.",
      },
      {
        q: "Do I need utm_term for email?",
        a: "No. Term is for paid keywords and audiences. Leave it empty rather than stuffing it — empty keeps GA4 rows clean.",
      },
    ],
  },
  {
    slug: "ga4",
    name: "GA4",
    title: "GA4 Channel Audit UTM Guide — Fix Misattributed Traffic",
    description:
      "Free GA4 UTM audit guide, no login. Learn how utm_source and utm_medium map to default channel groups, fix (direct) rows, and standardize team conventions.",
    keywords: [
      "ga4 utm audit",
      "ga4 default channel grouping utm",
      "ga4 direct traffic fix",
      "utm naming convention ga4",
      "ga4 campaign attribution",
    ],
    heading: "GA4 Channel Audit Guide",
    intro:
      "Half of all 'why is everything Direct?' mysteries are UTM inconsistencies. This guide maps source/medium values to GA4's default channel groups and gives your team a convention that keeps rows clean. Audit with the builder below.",
    convention: [
      {
        param: "utm_source",
        value: "audit",
        why: "In real use this is the referrer or platform (google, newsletter, linkedin). Audit by listing every distinct source in your last 30 days of traffic.",
      },
      {
        param: "utm_medium",
        value: "referral",
        why: "Medium drives channel grouping: organic→Organic Search, cpc→Paid Search, email→Email, social/paid_social→Organic/Paid Social. Unknown mediums fall to Unassigned or Direct.",
      },
      {
        param: "utm_campaign",
        value: "channel-audit",
        why: "Group the audit itself as one campaign so the test clicks stay findable — then delete or filter them after.",
      },
      {
        param: "utm_term",
        value: "",
        why: "Empty unless auditing paid search; term only matters for keyword-level rows.",
      },
      {
        param: "utm_content",
        value: "row-a",
        why: "Tag each audited row distinctly so you can verify every variant lands in the intended channel.",
      },
    ],
    notes: [
      {
        heading: "Case sensitivity splits rows",
        body: "GA4 treats Email and email as different mediums in different channels. Standardize on lowercase everywhere — this builder enforces it automatically.",
      },
      {
        heading: "Redirects eat UTMs",
        body: "Every hop must forward the query string or GA4 sees an untagged landing and files it under Direct. Test each short-link and redirect chain with the redirect checker before blaming the channel model.",
      },
      {
        heading: "Document the convention once",
        body: "Agree on a short list of sources (newsletter, linkedin, google) and mediums (email, social, cpc) and pin it where the team writes links. Consistency beats cleverness in campaign reporting.",
      },
    ],
    examples: [
      {
        label: "Paid social audit row",
        url: "https://example.com/pricing?utm_source=linkedin&utm_medium=paid_social&utm_campaign=channel-audit&utm_content=row-a",
      },
      {
        label: "Email audit row",
        url: "https://example.com/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=channel-audit&utm_content=row-b",
      },
    ],
    faq: [
      {
        q: "Why does GA4 show traffic as (direct) / (none)?",
        a: "No referrer and no usable UTMs — commonly stripped query strings on redirect, in-app browsers, or dark-social copy-paste. Tag systematically and verify redirect chains preserve parameters.",
      },
      {
        q: "Which medium values map to which GA4 channels?",
        a: "organic→Organic Search, cpc/cpm/paid→Paid variants, email→Email, social→Organic Social, paid_social→Paid Social, referral→Referral. Anything else risks Unassigned.",
      },
      {
        q: "Should I backfill old UTM values?",
        a: "No — GA4 does not reprocess history. Fix the convention going forward and annotate the change date so past/future rows are never compared naively.",
      },
      {
        q: "How often should we audit UTMs?",
        a: "Monthly for active teams: export distinct source/medium/campaign triples, kill duplicates and casing variants, and update the pinned convention list.",
      },
    ],
  },
];

export function getPlatformPreset(slug: string): PlatformPreset | undefined {
  return PLATFORM_PRESETS.find((p) => p.slug === slug);
}

export function getPlatformPage(slug: string): PlatformPage | undefined {
  return PLATFORM_PAGES.find((p) => p.slug === slug);
}
