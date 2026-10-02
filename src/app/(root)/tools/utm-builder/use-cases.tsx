import Link from "next/link";

// Server-rendered, crawlable copy: each block targets a real "UTM Builder
// for <segment>" query with the segment's actual workflow. Kept on the tool
// page (not 10 thin duplicate pages) so one strong URL accumulates authority.
type Segment = {
  id: string;
  name: string;
  intro: string;
  example: string;
};

export const UTM_SEGMENTS: Segment[] = [
  {
    id: "agencies",
    name: "Agencies",
    intro:
      "Client work means every campaign needs its own clean attribution — and a naming convention your whole team can follow. Standardise sources and mediums across accounts, then hand clients GA4 reports that reconcile on the first try.",
    example:
      "?utm_source=clientname&utm_medium=email&utm_campaign=q4-launch&utm_content=header-cta",
  },
  {
    id: "saas",
    name: "SaaS",
    intro:
      "Track signup paths from docs, changelogs, partner listings and lifecycle emails. Consistent UTMs let you compare activation by channel instead of guessing which blog post or integration page actually converts.",
    example: "?utm_source=docs&utm_medium=referral&utm_campaign=api-guide",
  },
  {
    id: "ecommerce",
    name: "Ecommerce",
    intro:
      "Give each sale, product drop and paid placement its own campaign tag so GA4 ties revenue back to the exact creative. Distinguish organic social from paid social with utm_medium, and vary utm_content per ad variant to compare ROAS.",
    example:
      "?utm_source=instagram&utm_medium=paid_social&utm_campaign=black-friday&utm_content=reel-a",
  },
  {
    id: "performance-marketing",
    name: "Performance marketing",
    intro:
      "Every ad variant deserves a distinct utm_content so optimisation platforms and GA4 agree on what won. Pair utm_term with the target keyword or audience to keep paid search reporting clean.",
    example:
      "?utm_source=google&utm_medium=cpc&utm_campaign=spring-launch&utm_term=url-shortener",
  },
  {
    id: "seo",
    name: "SEO",
    intro:
      "Keep organic traffic honestly labelled as organic so it never mixes with paid. Tag newsletters, backlink placements and content collaborations separately, and use utm_content to see which internal CTA placement drives engagement.",
    example:
      "?utm_source=newsletter&utm_medium=email&utm_campaign=monthly-roundup&utm_content=hero",
  },
  {
    id: "email",
    name: "Email",
    intro:
      "Attribute every send, drip and lifecycle message. Use utm_medium=email and put the specific campaign in utm_campaign, then utm_content for the button or banner a subscriber actually clicked.",
    example:
      "?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest&utm_content=header-cta",
  },
  {
    id: "social",
    name: "Social",
    intro:
      "Separate platforms by source and paid from organic by medium. One campaign tag per post or story, and utm_content per slide or variant, so you can tell which format actually moved traffic.",
    example:
      "?utm_source=linkedin&utm_medium=social&utm_campaign=founder-story&utm_content=carousel-1",
  },
  {
    id: "creators",
    name: "Creators",
    intro:
      "Track every link in bio, sponsor slot and collaboration in one dashboard. Tag each sponsor or platform so brand deals are measurable, and shorten the finished campaign URL so long UTM strings never clutter your posts.",
    example:
      "?utm_source=youtube&utm_medium=video&utm_campaign=sponsor-acme&utm_content=description",
  },
  {
    id: "teams",
    name: "Teams",
    intro:
      "A shared naming convention stops 'Email', 'email' and 'e-mail' becoming three rows in GA4. Agree on a short preset list, build campaign URLs together, then hand off links with consistent tags.",
    example: "?utm_source=newsletter&utm_medium=email&utm_campaign=team-update",
  },
  {
    id: "affiliate",
    name: "Affiliate",
    intro:
      "Give every partner their own utm_content so payouts and performance line up. Use utm_medium=affiliate everywhere, and let Slugy shorten the tagged URL so the destination stays clean and trackable.",
    example:
      "?utm_source=partner-x&utm_medium=affiliate&utm_campaign=always-on",
  },
];

export default function UtmUseCases() {
  return (
    <section
      aria-labelledby="utm-use-cases"
      className="mx-auto max-w-4xl px-4 pb-16"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Use cases
        </p>
        <h2
          id="utm-use-cases"
          className="mt-2 text-xl font-medium text-balance sm:text-2xl"
        >
          UTM Builder for agencies, SaaS, ecommerce and more
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm">
          One naming convention, every channel. See how each team tags campaigns
          so GA4 reporting stays clean.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
        {UTM_SEGMENTS.map((segment) => (
          <article
            key={segment.id}
            id={segment.id}
            className="flex flex-col rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h3 className="text-base font-medium">
              UTM Builder for {segment.name}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {segment.intro}
            </p>
            <code className="mt-3 block rounded-md bg-zinc-100 p-2.5 font-mono text-[11px] leading-relaxed break-all text-zinc-700 sm:text-xs dark:bg-zinc-900 dark:text-zinc-300">
              {segment.example}
            </code>
          </article>
        ))}
      </div>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Ready to build one?{" "}
        <Link
          href="/tools/utm-builder"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Open the free UTM Builder
        </Link>{" "}
        — no login, then shorten the result with{" "}
        <Link
          href="/"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Slugy
        </Link>
        .
      </p>
    </section>
  );
}
