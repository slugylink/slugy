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

export default function SlugyVsFirstpromoterPost() {
  return (
    <article className="prose-slugy">
      <P>
        FirstPromoter tracks affiliate referrals and commissions for SaaS and
        e-commerce. Slugy handles what happens one step earlier: the branded
        short links, QR codes, and click data behind every affiliate share.
      </P>

      <Callout>
        <strong>TL;DR:</strong> FirstPromoter attributes revenue to affiliates;
        Slugy brands the links and shows the clicks behind that revenue.
        Complementary, not competing.
      </Callout>

      <H2 id="what-firstpromoter-does-best">What FirstPromoter does best</H2>
      <P>
        FirstPromoter gives each affiliate a dashboard, tracks their referred
        sales, and manages commission payouts. Its value is revenue attribution
        and partner management — areas Slugy intentionally does not cover.
      </P>

      <H2 id="where-slugy-fits">Where Slugy fits alongside it</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Branded affiliate links</strong> —
          replace raw referral URLs with memorable links on your own domain.
        </li>
        <li>
          <strong className="text-foreground">Click-level insight</strong> —
          know which affiliates drive traffic even before sales land, with
          referrer and geo breakdowns.
        </li>
        <li>
          <strong className="text-foreground">QR codes + bio pages</strong> —
          offline-ready codes and link-in-bio pages extend affiliates beyond the
          browser.
        </li>
        <li>
          <strong className="text-foreground">Lead conversion tracking</strong>{" "}
          — attribute signups to exact links on Pro, enriching what
          FirstPromoter reports downstream.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          [
            "Category",
            "FirstPromoter: affiliate tracking · Slugy: link platform",
          ],
          ["Commission payouts", "FirstPromoter"],
          ["Branded links + QR", "Slugy"],
          ["Per-link click analytics", "Slugy"],
          ["Open source", "Slugy is open source"],
        ]}
      />

      <Shot
        src="/images/features/f2_converted.webp"
        alt="Slugy conversion funnel from clicks to leads to sales"
        caption="Clicks to leads to sales: the upstream half FirstPromoter never sees."
        width={1270}
        height={960}
      />

      <H2 id="pricing">What the combination costs</H2>
      <P>
        FirstPromoter starts around $49/month for affiliate tracking and
        payouts. Slugy covers the upstream click layer starting free, with Pro
        at $8/month ($5/month forever with GETPRO) adding signup attribution per
        link.
      </P>
      <PricingTable
        competitor="FirstPromoter"
        rows={[
          [
            "Entry",
            "Slugy Free $0 — branded links, QR, per-link clicks",
            "FirstPromoter from ~$49/mo — affiliate tracking + payouts",
          ],
          [
            "Growth",
            "Slugy Pro $8/mo ($5/mo forever with GETPRO) — lead tracking",
            "Higher FirstPromoter tiers — more affiliates and sales volume",
          ],
        ]}
        note="Prices change often — checked September 2026. Verify FirstPromoter's current pricing page; Slugy numbers are from slugy.co/pricing."
      />

      <H2 id="setup">Setting them up together</H2>
      <Steps
        items={[
          <>
            <strong className="text-foreground">
              Brand the referral URLs.
            </strong>{" "}
            Replace raw FirstPromoter referral links with memorable Slugy links
            on your own domain.
          </>,
          <>
            <strong className="text-foreground">
              Watch traffic before sales land.
            </strong>{" "}
            Referrer and geo breakdowns show which affiliates drive visits, days
            before commissions post.
          </>,
          <>
            <strong className="text-foreground">
              Attribute signups on Pro.
            </strong>{" "}
            Tie signups to exact links to enrich what FirstPromoter reports
            downstream.
          </>,
          <>
            <strong className="text-foreground">Extend offline.</strong> QR
            codes and bio pages take affiliates beyond the browser.
          </>,
        ]}
      />

      <H2 id="verdict">Verdict</H2>
      <P>
        Keep revenue attribution in FirstPromoter; put the links themselves in
        Slugy. Affiliates share nicer URLs, and you see the full funnel from
        click to commission.
      </P>
      <Cta />
    </article>
  );
}
