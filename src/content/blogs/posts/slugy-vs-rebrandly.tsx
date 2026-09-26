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

export default function SlugyVsRebrandlyPost() {
  return (
    <article className="prose-slugy">
      <P>
        Rebrandly built its name on branded links — custom domains and
        consistent link branding across teams. Slugy starts from the same idea
        and adds the rest of the campaign toolkit: QR codes, bio pages,
        analytics, and lead conversion tracking, on a free plan, from an
        open-source codebase.
      </P>

      <Callout>
        <strong>TL;DR:</strong> Rebrandly is a solid branding-first shortener.
        Choose Slugy if you want branding plus analytics depth, bio pages, and
        conversion attribution without stacking extra tools.
      </Callout>

      <H2 id="what-rebrandly-does-best">What Rebrandly does best</H2>
      <P>
        Rebrandly focuses on link branding at team scale: multiple custom
        domains, consistent naming, and workspace collaboration. Marketing teams
        whose main requirement is on-brand links across many hands are its
        natural audience.
      </P>

      <H2 id="where-slugy-differs">Where Slugy differs</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Campaign analytics</strong> —
          referrers, UTM campaigns, geo, and devices with shareable client-ready
          views.
        </li>
        <li>
          <strong className="text-foreground">Bio pages included</strong> — a
          link-in-bio page on your own domain instead of a separate product.
        </li>
        <li>
          <strong className="text-foreground">Lead conversion tracking</strong>{" "}
          — tie signups and purchases back to the link on Pro.
        </li>
        <li>
          <strong className="text-foreground">Open source + free plan</strong> —
          audit the code, start free with no credit card.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          ["Category", "Both are branded link platforms"],
          ["Team workspaces", "Both support them"],
          ["Bio / link-in-bio", "Included in Slugy"],
          ["Lead conversion tracking", "Included in Slugy Pro"],
          ["Open source", "Slugy is open source"],
        ]}
      />

      <Shot
        src="/images/features/f2_converted.webp"
        alt="Slugy analytics funnel showing clicks converting to leads and sales"
        caption="Slugy's funnel view: clicks to leads to sales, per link and per campaign."
        width={1270}
        height={960}
      />

      <H2 id="pricing">Pricing side by side</H2>
      <P>
        Rebrandly prices per branded-link volume with paid plans starting around
        $13/month. Slugy Pro is a flat $8/month ($5/month forever with GETPRO)
        with 250 new links/month, 10k tracked clicks, and conversion tracking
        included — no per-link metering to watch.
      </P>
      <PricingTable
        competitor="Rebrandly"
        rows={[
          [
            "Free",
            "$0 — 10 links/mo, 1k clicks/mo, QR + bio included",
            "$0 — limited branded links to try the platform",
          ],
          [
            "Mid tier",
            "Pro $8/mo ($5/mo forever with GETPRO) — 250 links/mo, lead tracking",
            "Paid from ~$13/mo — more branded links and domains",
          ],
          [
            "Top tier",
            "Business $29/mo — 1,500 links/mo, 50k clicks/mo, sales analytics",
            "Team/enterprise tiers — check current pricing",
          ],
        ]}
        note="Prices change often — checked September 2026. Verify Rebrandly's current pricing page; Slugy numbers are from slugy.co/pricing."
      />

      <H2 id="migrating">Migrating from Rebrandly to Slugy</H2>
      <P>
        Export your Rebrandly links to CSV, point your custom domain at Slugy
        with the guided DNS setup, and import. Branded slugs and destinations
        carry over; check both pricing pages for current plan limits first.
      </P>
      <Steps
        items={[
          <>
            <strong className="text-foreground">Export from Rebrandly.</strong>{" "}
            Export your branded links to CSV from the Rebrandly dashboard.
          </>,
          <>
            <strong className="text-foreground">Move your domain.</strong> Point
            your custom domain at Slugy and complete the guided DNS setup —
            branded slugs keep working.
          </>,
          <>
            <strong className="text-foreground">Import the CSV.</strong>{" "}
            Destinations and UTM parameters carry over automatically.
          </>,
          <>
            <strong className="text-foreground">Verify, then switch.</strong>{" "}
            Test branded links across campaigns before cancelling Rebrandly.
          </>,
        ]}
      />

      <H2 id="verdict">Verdict</H2>
      <P>
        If branded links alone are the job, Rebrandly does it well. If you want
        branding plus proof of what worked — analytics, bio, conversions — Slugy
        packs it into one workspace.
      </P>
      <Cta />
    </article>
  );
}
