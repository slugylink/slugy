import { Callout, Cta, Facts, H2, P, Ul } from "./_compare";

export default function SlugyVsBlinkPost() {
  return (
    <article className="prose-slugy">
      <P>
        BL.INK is an enterprise link platform known for analytics depth and
        compliance-friendly controls. Slugy brings the same analytics-first
        mindset — referrers, campaigns, geo, devices, and a conversion funnel —
        to teams that would rather start free and skip the enterprise sales
        process.
      </P>

      <Callout>
        <strong>TL;DR:</strong> BL.INK serves regulated enterprises with
        compliance needs. Slugy serves everyone else: deep-enough analytics, QR,
        bio, and conversion tracking in an open-source, free-to-start workspace.
      </Callout>

      <H2 id="what-blink-does-best">What BL.INK does best</H2>
      <P>
        BL.INK combines branded shortening with serious analytics and the
        administrative controls large, regulated organizations expect. If your
        checklist includes compliance reviews and dedicated account management,
        that is what you are paying for.
      </P>

      <H2 id="where-slugy-differs">Where Slugy differs</H2>
      <Ul>
        <li>
          <strong className="text-foreground">
            Analytics without enterprise
          </strong>{" "}
          — campaign, referrer, geo, and device breakdowns plus a
          clicks-to-leads funnel, self-serve.
        </li>
        <li>
          <strong className="text-foreground">Bio pages + QR included</strong> —
          link-in-bio on your domain and print-ready QR codes ride along with
          every link.
        </li>
        <li>
          <strong className="text-foreground">Lead conversion tracking</strong>{" "}
          — attribute revenue events to links on Pro.
        </li>
        <li>
          <strong className="text-foreground">Open source + free plan</strong> —
          audit the code, start free, upgrade when you grow.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          ["Category", "Both are analytics-led link platforms"],
          ["Buyer", "BL.INK: enterprise · Slugy: self-serve teams"],
          ["Bio / link-in-bio", "Included in Slugy"],
          ["Lead conversion tracking", "Included in Slugy Pro"],
          ["Open source", "Slugy is open source"],
        ]}
      />

      <H2 id="migrating">Migrating from BL.INK to Slugy</H2>
      <P>
        Export your links to CSV, reconnect your domain in Slugy, and import.
        Regulated teams should confirm Slugy meets their compliance bar before
        moving — the code is public, which makes that review easier.
      </P>

      <H2 id="verdict">Verdict</H2>
      <P>
        BL.INK for compliance-first enterprises; Slugy for teams that want
        analytics depth with startup speed and pricing.
      </P>
      <Cta />
    </article>
  );
}
