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

      <Shot
        src="/images/card2.png"
        alt="Slugy links dashboard showing branded short links with per-link click counts"
        caption="The Slugy dashboard: every link shows live click counts next to its destination."
        width={1270}
        height={760}
      />

      <H2 id="pricing">Pricing side by side</H2>
      <P>
        Slugy Pro costs $8/month ($80/year) — $5/month forever with code GETPRO
        — against Bitly Core from around $10/month and Growth at $29/month. Both
        have free plans; the difference is what the free and mid tiers actually
        include.
      </P>
      <PricingTable
        competitor="Bitly"
        rows={[
          [
            "Free",
            "$0 — 1 workspace, 10 links/mo, 1k clicks/mo, QR + bio included",
            "$0 — 5 links/mo, 2 QR codes/mo",
          ],
          [
            "Mid tier",
            "Pro $8/mo ($5/mo forever with GETPRO) — 250 links/mo, 10k clicks/mo, lead tracking",
            "Core from ~$10/mo — branded links, more volume",
          ],
          [
            "Top tier",
            "Business $29/mo — 1,500 links/mo, 50k clicks/mo, sales analytics",
            "Growth $29/mo and up — advanced analytics, more seats",
          ],
        ]}
        note="Prices change often — checked September 2026. Verify Bitly's current pricing page before deciding; Slugy numbers are from slugy.co/pricing."
      />

      <H2 id="migrating">Migrating from Bitly to Slugy</H2>
      <P>
        Export your links from Bitly as a CSV, connect your custom domain in
        Slugy with the guided DNS setup, then import the CSV — slugs,
        destinations, and UTM parameters carry over. Plan limits change often on
        both sides, so check the current pricing pages before you move a large
        workspace.
      </P>
      <Steps
        items={[
          <>
            <strong className="text-foreground">Export from Bitly.</strong> In
            your Bitly account, export your links to CSV (look for Export under
            settings or the links dashboard).
          </>,
          <>
            <strong className="text-foreground">Connect your domain.</strong>{" "}
            Add your custom domain in Slugy and follow the guided DNS setup so
            existing slugs keep resolving.
          </>,
          <>
            <strong className="text-foreground">Import the CSV.</strong> Upload
            the file in Slugy — slugs, destinations, and UTM parameters carry
            over automatically.
          </>,
          <>
            <strong className="text-foreground">Verify, then switch.</strong>{" "}
            Spot-check your highest-traffic links, keep Bitly active until
            clicks settle, then cancel.
          </>,
        ]}
      />

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
