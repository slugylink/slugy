import { Callout, Cta, Facts, H2, P, Ul } from "./_compare";

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

      <H2 id="migrating">Migrating from Rebrandly to Slugy</H2>
      <P>
        Export your Rebrandly links to CSV, point your custom domain at Slugy
        with the guided DNS setup, and import. Branded slugs and destinations
        carry over; check both pricing pages for current plan limits first.
      </P>

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
