import { Callout, Cta, Facts, H2, P, Ul } from "./_compare";

export default function SlugyVsRewardfulPost() {
  return (
    <article className="prose-slugy">
      <P>
        Rewardful is affiliate software, not a link shortener: it tracks
        referrals and pays commissions, typically for Stripe-billed SaaS. Slugy
        solves the adjacent problem — the branded links, QR codes, and analytics
        your affiliates actually share. Most programs need both.
      </P>

      <Callout>
        <strong>TL;DR:</strong> Rewardful runs your affiliate program; Slugy
        makes every affiliate link branded, trackable, and QR-ready. They
        complement each other.
      </Callout>

      <H2 id="what-rewardful-does-best">What Rewardful does best</H2>
      <P>
        Rewardful connects to Stripe, attributes referred subscriptions, and
        handles affiliate payouts and portals. If you sell subscriptions and
        want partners earning recurring commissions, that is its home turf —
        Slugy does not do payouts or affiliate portals.
      </P>

      <H2 id="where-slugy-fits">Where Slugy fits alongside it</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Branded affiliate links</strong> —
          give partners yourbrand.co/partner-name links instead of long referral
          URLs with query strings.
        </li>
        <li>
          <strong className="text-foreground">
            Click analytics per partner
          </strong>{" "}
          — referrers, geo, and devices show which affiliates drive traffic,
          before Rewardful reports the revenue.
        </li>
        <li>
          <strong className="text-foreground">QR codes for offline</strong> —
          print-ready codes for events, packaging, and meetups your affiliates
          attend.
        </li>
        <li>
          <strong className="text-foreground">Lead conversion tracking</strong>{" "}
          — attribute signups to the exact shared link on Pro, alongside
          Rewardful&apos;s commission data.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          ["Category", "Rewardful: affiliate software · Slugy: link platform"],
          ["Payouts & portals", "Rewardful"],
          ["Branded links + QR", "Slugy"],
          ["Per-link click analytics", "Slugy"],
          ["Open source", "Slugy is open source"],
        ]}
      />

      <H2 id="verdict">Verdict</H2>
      <P>
        This is not either-or. Run commissions in Rewardful; run the links
        affiliates share in Slugy, and both sides of your program get cleaner
        data.
      </P>
      <Cta />
    </article>
  );
}
