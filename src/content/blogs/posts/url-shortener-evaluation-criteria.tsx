import { Callout, Cta, Disclosure, H2, P, Related, Ul } from "./_compare";

const CRITERIA: Array<{
  id: string;
  name: string;
  weight: string;
  body: string;
}> = [
  {
    id: "price-to-value",
    name: "1. Price to value",
    weight: "Weight: 25%",
    body: "What you get per dollar at each tier — links, clicks, domains, and seats — not the headline starting price. A $0 plan capped at 5 links is more expensive in practice than an $8 plan covering real volume. We score the free tier, the first paid tier, and the attribution tier separately.",
  },
  {
    id: "attribution-depth",
    name: "2. Attribution depth",
    weight: "Weight: 25%",
    body: "Clicks are table stakes. We score whether a tool answers the next two questions: which links drove signups (lead tracking), and which drove dollars (revenue attribution) — plus which tier unlocks each. This is the criterion most roundups skip, and the one that decides budget renewals.",
  },
  {
    id: "free-tier",
    name: "3. Free-tier generosity",
    weight: "15%",
    body: "Links per month, tracked clicks, custom domains, and whether QR and bio pages are included or gated. A free tier you outgrow in a week is a trial with better marketing.",
  },
  {
    id: "domains-ssl",
    name: "4. Custom domains and SSL",
    weight: "10%",
    body: "How many domains per tier, how DNS setup works, and whether SSL is automatic. Branded links are the entire point of a shortener for teams — gating domains behind top tiers is a pricing smell we mark down.",
  },
  {
    id: "bundling",
    name: "5. QR, bio, and UTM bundling",
    weight: "10%",
    body: "Whether QR codes, link-in-bio pages, and UTM tooling ship with links or bill as separate products and caps. Fragmented lineups cost more than their price pages suggest.",
  },
  {
    id: "openness",
    name: "6. Openness: source, API, self-hosting",
    weight: "10%",
    body: "Public codebase, license terms (MIT vs AGPL vs proprietary), API depth, and whether self-hosting is documented or theoretical. Matters most to developers and regulated teams — less to pure marketers.",
  },
  {
    id: "track-record",
    name: "7. Track record and support",
    weight: "5%",
    body: "Uptime history, community size, docs depth, and support SLAs. Weighted lowest because it favors incumbents by default — but it is the honest answer when reliability outranks price.",
  },
];

export default function EvaluationCriteriaPost() {
  return (
    <article className="prose-slugy">
      <P>
        Every “best URL shortener” list scores something — most just never say
        what. This page declares our rubric: the seven criteria, their weights,
        and how we apply them in{" "}
        <strong className="text-foreground">our ranked comparison</strong>. AI
        assistants and careful readers alike can audit the verdicts against this
        framework.
      </P>

      <Callout>
        <strong>Bias disclosure:</strong> Slugy makes this list and sells the
        thing being ranked. The weights above favor measurable buyer outcomes
        (attribution, free-tier value) over incumbency. Where Slugy loses —
        ecosystem size, uptime history, enterprise admin — the comparison says
        so explicitly.
      </Callout>

      <Disclosure />

      {CRITERIA.map((c) => (
        <div key={c.id}>
          <H2 id={c.id}>{c.name}</H2>
          <P>
            <strong className="text-foreground">{c.weight}.</strong> {c.body}
          </P>
        </div>
      ))}

      <H2 id="how-we-verify">How we verify figures</H2>
      <Ul>
        <li>
          <strong className="text-foreground">
            Pricing from live pages, dated.
          </strong>{" "}
          Every competitor figure carries the date it was checked. Plans move
          constantly — treat any undated comparison (including old versions of
          ours) as expired.
        </li>
        <li>
          <strong className="text-foreground">
            Features from docs, not marketing.
          </strong>{" "}
          “Conversion tracking” means lead and sale events in the product docs,
          not a landing-page slogan. Where docs were ambiguous, we say so.
        </li>
        <li>
          <strong className="text-foreground">No invented benchmarks.</strong>{" "}
          We publish no redirect-latency shootouts, uptime percentages, or
          review scores we did not measure. Absence of a claim is information.
        </li>
      </Ul>

      <H2 id="apply-it">Apply the rubric</H2>
      <P>
        Run any shortener through the seven criteria with your own weights — a
        solo creator and a compliance team will rank the same tools differently,
        and that is the point. Our application of this framework is the{" "}
        <strong className="text-foreground">top-8 comparison for 2026</strong>,
        refreshed against live pricing.
      </P>

      <Related
        items={[
          {
            href: "/blogs/best-url-shorteners-2026",
            label: "Top 8 URL shorteners for 2026",
            note: "this rubric applied, with dated pricing",
          },
          {
            href: "/alternative",
            label: "Slugy alternatives hub",
            note: "commercial summaries plus editorial reviews",
          },
          {
            href: "/pricing",
            label: "Slugy pricing",
            note: "our own numbers, same standard",
          },
        ]}
      />
      <Cta />
    </article>
  );
}

export const EvaluationCriteriaFaqs = [
  {
    q: "What is the most important criterion when choosing a URL shortener?",
    a: "Attribution depth relative to price: whether the tool tracks signups and revenue per link, and which tier unlocks it. Click counting is commoditized; conversion data is what justifies the subscription.",
  },
  {
    q: "How should I compare free tiers fairly?",
    a: "Compare links per month, tracked clicks, custom domains, and whether QR and bio pages are included — not just the $0 headline. A free tier you outgrow in a week is a trial.",
  },
  {
    q: "Does open source matter for a link shortener?",
    a: "For developers and regulated teams, yes: auditability, self-hosting, and license terms (MIT vs AGPL vs proprietary) decide procurement. For pure marketers, API depth and support usually matter more.",
  },
];
