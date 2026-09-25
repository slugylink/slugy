import { Callout, Cta, Facts, H2, P, Ul } from "./_compare";

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

      <H2 id="verdict">Verdict</H2>
      <P>
        Different layers of the same stack. PartnerStack grows the channel;
        Slugy makes everything the channel shares measurable and on-brand.
      </P>
      <Cta />
    </article>
  );
}
