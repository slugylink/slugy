import { Callout, Cta, Facts, H2, P, Ul } from "./_compare";

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
