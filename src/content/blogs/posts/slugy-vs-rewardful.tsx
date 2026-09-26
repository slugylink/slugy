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

      <Shot
        src="/images/card1.png"
        alt="Branded Slugy affiliate links with per-link click counts"
        caption="One branded link per partner, each with its own click counts."
        width={1573}
        height={1080}
      />

      <H2 id="pricing">What the combination costs</H2>
      <P>
        Rewardful starts around $49/month for Stripe-connected affiliate
        programs. The Slugy layer on top starts free — branded links, QR codes,
        and per-partner click analytics at $0, with Pro at $8/month ($5/month
        forever with GETPRO) when you want signup attribution per link.
      </P>
      <PricingTable
        competitor="Rewardful"
        rows={[
          [
            "Entry",
            "Slugy Free $0 — branded links, QR, per-link clicks",
            "Rewardful from ~$49/mo — affiliate tracking + payouts",
          ],
          [
            "Growth",
            "Slugy Pro $8/mo ($5/mo forever with GETPRO) — lead tracking per link",
            "Higher Rewardful tiers — more affiliates and revenue",
          ],
        ]}
        note="Prices change often — checked September 2026. Verify Rewardful's current pricing page; Slugy numbers are from slugy.co/pricing."
      />

      <H2 id="setup">Setting them up together</H2>
      <Steps
        items={[
          <>
            <strong className="text-foreground">
              Create a link per partner.
            </strong>{" "}
            In Slugy, make one branded link per affiliate
            (yourbrand.co/partner-name) pointing at their Rewardful referral
            URL.
          </>,
          <>
            <strong className="text-foreground">Share the short link.</strong>{" "}
            Partners share the branded URL everywhere; clicks, referrers, and
            geo show up in Slugy instantly.
          </>,
          <>
            <strong className="text-foreground">Reconcile with payouts.</strong>{" "}
            Compare Slugy&apos;s per-partner traffic with Rewardful&apos;s
            commission reports to spot your real drivers.
          </>,
          <>
            <strong className="text-foreground">
              Attribute signups on Pro.
            </strong>{" "}
            Enable lead tracking to tie signups to the exact shared link,
            alongside Rewardful&apos;s data.
          </>,
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
