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

export default function SlugyVsPartnerstackPost() {
  return (
    <article className="prose-slugy">
      <P>
        PartnerStack runs partner ecosystems — affiliate, referral, and reseller
        programs with a marketplace of partners. Slugy is the link layer
        underneath: branded links, QR codes, and click analytics for every URL
        your partners share.
      </P>

      <Callout>
        <strong>TL;DR:</strong> PartnerStack manages partner relationships and
        payouts; Slugy brands and measures the links those partners distribute.
        Use them together.
      </Callout>

      <H2 id="what-partnerstack-does-best">What PartnerStack does best</H2>
      <P>
        PartnerStack combines program management, a partner marketplace for
        discovery, and payouts across affiliate, referral, and reseller motions.
        Companies building a partner channel — not just links — live there.
        Slugy does none of that; it makes links.
      </P>

      <H2 id="where-slugy-fits">Where Slugy fits alongside it</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Branded partner links</strong> —
          one custom domain serves every partner&apos;s tracking links, so your
          brand travels with each share.
        </li>
        <li>
          <strong className="text-foreground">Pre-conversion analytics</strong>{" "}
          — see clicks by partner, referrer, and geo before PartnerStack reports
          the outcome.
        </li>
        <li>
          <strong className="text-foreground">QR + bio for partners</strong> —
          event-ready QR codes and link-in-bio pages your partners can reuse.
        </li>
        <li>
          <strong className="text-foreground">Free to start</strong> — no credit
          card, open-source codebase, CSV import when you scale to hundreds of
          partner links.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          [
            "Category",
            "PartnerStack: partnerships platform · Slugy: link platform",
          ],
          ["Partner marketplace & payouts", "PartnerStack"],
          ["Branded links + QR", "Slugy"],
          ["Per-link click analytics", "Slugy"],
          ["Open source", "Slugy is open source"],
        ]}
      />

      <Shot
        src="/images/card2.png"
        alt="Slugy links dashboard tracking partner links with click counts"
        caption="Every partner link tracked in one dashboard, before payouts are calculated."
        width={1270}
        height={760}
      />

      <H2 id="pricing">What the combination costs</H2>
      <P>
        PartnerStack is sales-led with custom pricing for partner programs. The
        Slugy link layer starts free — branded partner links and click analytics
        at $0, Pro at $8/month ($5/month forever with GETPRO) when you need
        signup attribution and volume.
      </P>
      <PricingTable
        competitor="PartnerStack"
        rows={[
          [
            "Entry",
            "Slugy Free $0 — branded links, QR, per-link clicks",
            "PartnerStack custom pricing — program management + marketplace",
          ],
          [
            "Growth",
            "Slugy Pro $8/mo ($5/mo forever with GETPRO) — lead tracking",
            "Scales with your partner program — talk to their sales team",
          ],
        ]}
        note="PartnerStack prices by program size — checked September 2026. Slugy numbers are from slugy.co/pricing."
      />

      <H2 id="setup">Setting them up together</H2>
      <Steps
        items={[
          <>
            <strong className="text-foreground">
              Put Slugy in front of partner URLs.
            </strong>{" "}
            Create branded links on one custom domain for every partner&apos;s
            tracking URL.
          </>,
          <>
            <strong className="text-foreground">
              Watch pre-conversion traffic.
            </strong>{" "}
            See clicks by partner, referrer, and geo in Slugy before
            PartnerStack reports the outcome.
          </>,
          <>
            <strong className="text-foreground">
              Reuse QR and bio assets.
            </strong>{" "}
            Give partners event-ready QR codes and link-in-bio pages from the
            same workspace.
          </>,
          <>
            <strong className="text-foreground">Scale with CSV.</strong> Import
            hundreds of partner links at once when the program grows.
          </>,
        ]}
      />

      <H2 id="verdict">Verdict</H2>
      <P>
        Different layers of the same stack. PartnerStack grows the channel;
        Slugy makes everything the channel shares measurable and on-brand.
      </P>
      <Cta />
    </article>
  );
}
