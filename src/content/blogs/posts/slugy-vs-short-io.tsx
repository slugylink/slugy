import {
  Callout,
  Cta,
  Facts,
  H2,
  P,
  PricingTable,
  Shot,
  Steps,
  Ul,
} from "./_compare";

export default function SlugyVsShortIoPost() {
  return (
    <article className="prose-slugy">
      <P>
        Short.io targets teams that need white-label links at scale — custom
        domains, deep linking, and API-driven workflows. Slugy is the
        lighter-weight alternative: branded links, QR codes, bio pages, and
        analytics in one free-to-start, open-source workspace.
      </P>

      <Callout>
        <strong>TL;DR:</strong> Short.io suits API-heavy, white-label setups.
        Slugy suits teams and creators who want links, QR, bio, and conversions
        live the same afternoon.
      </Callout>

      <H2 id="what-shortio-does-best">What Short.io does best</H2>
      <P>
        Short.io leans into white-labeling and developer workflows: custom
        domains everywhere, mobile deep links, and API-first link operations for
        larger catalogs. Teams embedding links into their own product surfaces
        are its core users.
      </P>

      <H2 id="where-slugy-differs">Where Slugy differs</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Faster setup</strong> — custom
          domain, branded links, and QR codes live in minutes, no implementation
          project.
        </li>
        <li>
          <strong className="text-foreground">Bio pages included</strong> — a
          link-in-bio page with per-button analytics on your own domain.
        </li>
        <li>
          <strong className="text-foreground">Lead conversion tracking</strong>{" "}
          — attribute signups and purchases to the link on Pro.
        </li>
        <li>
          <strong className="text-foreground">Open source + free plan</strong> —
          public codebase, free start with no credit card, plus API keys when
          you need automation.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          ["Category", "Both are branded link platforms"],
          ["API access", "Both offer API keys"],
          ["Bio / link-in-bio", "Included in Slugy"],
          ["Lead conversion tracking", "Included in Slugy Pro"],
          ["Open source", "Slugy is open source"],
        ]}
      />

      <Shot
        src="/images/card1.png"
        alt="Slugy link cards showing short links with live click counts"
        caption="Every Slugy link card shows live click counts next to its destination."
        width={1573}
        height={1080}
      />

      <H2 id="pricing">Pricing side by side</H2>
      <P>
        Short.io prices by link volume with paid plans starting around
        $14/month. Slugy Pro is a flat $8/month ($5/month forever with GETPRO)
        for 250 new links/month and 10k tracked clicks — with QR, bio, and lead
        tracking included rather than tiered add-ons.
      </P>
      <PricingTable
        competitor="Short.io"
        rows={[
          [
            "Free",
            "$0 — 10 links/mo, 1k clicks/mo, QR + bio included",
            "$0 — limited volume to try the platform",
          ],
          [
            "Mid tier",
            "Pro $8/mo ($5/mo forever with GETPRO) — 250 links/mo, lead tracking",
            "Paid from ~$14/mo — more links and custom domains",
          ],
          [
            "Top tier",
            "Business $29/mo — 1,500 links/mo, 50k clicks/mo, sales analytics",
            "Team/enterprise tiers — check current pricing",
          ],
        ]}
        note="Prices change often — checked September 2026. Verify Short.io's current pricing page; Slugy numbers are from slugy.co/pricing."
      />

      <H2 id="migrating">Migrating from Short.io to Slugy</H2>
      <P>
        Export your links, reconnect your custom domain in Slugy, and import via
        CSV. If you rely on mobile deep-link routing, verify Slugy covers your
        schemes before moving production traffic.
      </P>
      <Steps
        items={[
          <>
            <strong className="text-foreground">Export from Short.io.</strong>{" "}
            Export your links to CSV from the Short.io dashboard.
          </>,
          <>
            <strong className="text-foreground">Reconnect your domain.</strong>{" "}
            Add your custom domain in Slugy with the guided DNS setup.
          </>,
          <>
            <strong className="text-foreground">Import via CSV.</strong> Slugs,
            destinations, and UTM parameters carry over; API keys are available
            when you need automation again.
          </>,
          <>
            <strong className="text-foreground">
              Verify deep links, then switch.
            </strong>{" "}
            If you rely on mobile deep-link routing, confirm your schemes work
            before moving production traffic.
          </>,
        ]}
      />

      <H2 id="verdict">Verdict</H2>
      <P>
        Short.io for white-label infrastructure; Slugy for speed and breadth —
        one workspace for links, QR, bio, analytics, and conversions.
      </P>
      <Cta />
    </article>
  );
}
