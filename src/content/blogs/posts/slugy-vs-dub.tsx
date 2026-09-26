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

export default function SlugyVsDubPost() {
  return (
    <article className="prose-slugy">
      <P>
        Dub.co raised the bar for modern link management — and, like Slugy, it
        is open source. If you are choosing between the two, the decision comes
        down to which extras matter to you: both cover branded links, custom
        domains, QR codes, and analytics, while Slugy bundles bio pages and lead
        conversion tracking into the same workspace.
      </P>

      <Callout>
        <strong>TL;DR:</strong> Both are open-source link platforms. Shortlist
        Dub.co for its ecosystem and maturity; shortlist Slugy if you also want
        link-in-bio pages and signup/purchase attribution in one free- to-start
        place.
      </Callout>

      <H2 id="what-dub-does-best">What Dub.co does best</H2>
      <P>
        Dub.co pairs a polished dashboard with a large open-source community,
        extensive documentation, and a well-known API. Teams that already run on
        Dub or build internal tooling around its API have good reasons to stay.
      </P>

      <H2 id="where-slugy-differs">Where Slugy differs</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Bio pages included</strong> — a
          branded link-in-bio page on your own domain, with per-button click
          analytics, next to your short links.
        </li>
        <li>
          <strong className="text-foreground">Lead conversion tracking</strong>{" "}
          — attribute signups and purchases back to the referring link on Pro
          via a single API call.
        </li>
        <li>
          <strong className="text-foreground">Free plan, no credit card</strong>{" "}
          — branded links, QR codes, and analytics to start, with CSV import
          when you migrate.
        </li>
        <li>
          <strong className="text-foreground">Open source too</strong> — audit
          the code on GitHub, same as you can with Dub.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          ["Category", "Both are link management platforms"],
          ["Open source", "Both — compare repos and activity on GitHub"],
          ["Custom domains", "Both support them"],
          ["Bio / link-in-bio", "Included in Slugy"],
          ["Lead conversion tracking", "Included in Slugy Pro"],
        ]}
      />

      <Shot
        src="/images/features/f4_converted.webp"
        alt="Slugy bio page with branded links and per-button analytics"
        caption="Slugy bio pages live on your own domain, with analytics on every button."
        width={1270}
        height={960}
      />

      <H2 id="pricing">Pricing side by side</H2>
      <P>
        Dub&apos;s free plan is generous (25 links/month, 1k tracked events),
        and Slugy&apos;s is built the same way: free to start, then Pro at
        $8/month ($5/month forever with GETPRO) when you need lead conversion
        tracking and more volume.
      </P>
      <PricingTable
        competitor="Dub.co"
        rows={[
          [
            "Free",
            "$0 — 1 workspace, 10 links/mo, 1k clicks/mo, QR + bio included",
            "$0 — 25 links/mo, 1k events/mo",
          ],
          [
            "Mid tier",
            "Pro $8/mo ($5/mo forever with GETPRO) — 250 links/mo, 10k clicks/mo, lead tracking",
            "Pro from ~$24/mo — higher limits, more features",
          ],
          [
            "Top tier",
            "Business $29/mo — 1,500 links/mo, 50k clicks/mo, sales analytics",
            "Business/enterprise tiers — check current pricing",
          ],
        ]}
        note="Prices change often — checked September 2026. Verify Dub's current pricing page; Slugy numbers are from slugy.co/pricing."
      />

      <H2 id="migrating">Migrating from Dub.co to Slugy</H2>
      <P>
        Export your Dub links, connect your custom domain in Slugy, and import
        everything via CSV. Because both platforms are open source, you can
        compare data models and self-hosting options side by side before
        committing.
      </P>
      <Steps
        items={[
          <>
            <strong className="text-foreground">Export from Dub.co.</strong>{" "}
            Export your links to CSV from the Dub dashboard.
          </>,
          <>
            <strong className="text-foreground">Connect your domain.</strong>{" "}
            Add your custom domain in Slugy with the guided DNS setup.
          </>,
          <>
            <strong className="text-foreground">Import the CSV.</strong> Slugs,
            destinations, and UTM parameters carry over; bio pages and lead
            tracking can be switched on per link afterwards.
          </>,
          <>
            <strong className="text-foreground">Verify, then switch.</strong>{" "}
            Spot-check top links and analytics continuity before pointing
            production traffic at Slugy.
          </>,
        ]}
      />

      <H2 id="verdict">Verdict</H2>
      <P>
        You cannot go wrong with either on openness. Pick Dub.co for ecosystem
        maturity; pick Slugy if bio pages plus conversion attribution in one
        workspace sounds like fewer tools to pay for.
      </P>
      <Cta />
    </article>
  );
}
