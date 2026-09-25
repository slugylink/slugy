import { Callout, Cta, Facts, H2, P, Ul } from "./_compare";

export default function SlugyVsBitlyPost() {
  return (
    <article className="prose-slugy">
      <P>
        Bitly defined the short-link category and remains the default choice at
        large companies. Slugy covers the same core job — branded links, custom
        domains, QR codes, and click analytics — with a free plan, bio pages,
        and lead conversion tracking included instead of gated behind enterprise
        tiers.
      </P>

      <Callout>
        <strong>TL;DR:</strong> Stay on Bitly if procurement requires an
        enterprise vendor. Switch to Slugy if you want branded links, QR codes,
        bio pages, and conversion tracking on a free plan, from an open-source
        codebase.
      </Callout>

      <H2 id="what-bitly-does-best">What Bitly does best</H2>
      <P>
        Bitly is a mature, enterprise-grade link management platform: branded
        short domains, bulk link creation, campaign analytics, and integrations
        backed by a large sales and support organization. If your buying process
        needs SOC 2 reports, SLAs, and a vendor your legal team already knows,
        that incumbency is genuinely valuable.
      </P>

      <H2 id="where-slugy-differs">Where Slugy differs</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Free plan, no credit card</strong>{" "}
          — branded links, QR codes, and analytics without starting a sales
          conversation.
        </li>
        <li>
          <strong className="text-foreground">Bio pages included</strong> — a
          link-in-bio page on your own domain lives next to your short links,
          not in a second subscription.
        </li>
        <li>
          <strong className="text-foreground">Lead conversion tracking</strong>{" "}
          — attribute signups and purchases back to the link on Pro, instead of
          stitching a separate attribution tool.
        </li>
        <li>
          <strong className="text-foreground">Open source</strong> — the
          codebase is public on GitHub, so you can audit exactly what happens to
          your links and clicks.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          ["Category", "Both are link management platforms"],
          ["Vendor type", "Bitly: enterprise vendor · Slugy: open source"],
          ["Free plan", "Both offer one — compare current limits"],
          ["Bio / link-in-bio", "Included in Slugy"],
          ["Lead conversion tracking", "Included in Slugy Pro"],
        ]}
      />

      <H2 id="migrating">Migrating from Bitly to Slugy</H2>
      <P>
        Export your links from Bitly as a CSV, connect your custom domain in
        Slugy with the guided DNS setup, then import the CSV — slugs,
        destinations, and UTM parameters carry over. Plan limits change often on
        both sides, so check the current pricing pages before you move a large
        workspace.
      </P>

      <H2 id="verdict">Verdict</H2>
      <P>
        Bitly wins on enterprise procurement; Slugy wins on value and openness.
        Small teams, creators, and agencies that want everything — links, QR,
        bio, analytics, conversions — in one free-to-start place should try
        Slugy first.
      </P>
      <Cta />
    </article>
  );
}
