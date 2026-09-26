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

export default function SlugyVsToltPost() {
  return (
    <article className="prose-slugy">
      <P>
        Tolt offers lightweight affiliate tracking aimed at SaaS startups. Slugy
        is the companion link layer: branded short links, QR codes, and
        analytics that make your affiliates&apos; shares measurable and
        on-brand.
      </P>

      <Callout>
        <strong>TL;DR:</strong> Tolt tracks affiliate-driven revenue; Slugy
        brands the links and captures the click data upstream. Startups often
        need both, and both start cheap.
      </Callout>

      <H2 id="what-tolt-does-best">What Tolt does best</H2>
      <P>
        Tolt keeps affiliate programs simple for early-stage SaaS: referral
        tracking, commission rules, and affiliate payouts without enterprise
        complexity. Like the other affiliate tools here, it answers “who earned
        what” — not “which link got clicked.”
      </P>

      <H2 id="where-slugy-fits">Where Slugy fits alongside it</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Branded affiliate links</strong> —
          your domain on every partner share, from day one.
        </li>
        <li>
          <strong className="text-foreground">Startup-friendly pricing</strong>{" "}
          — a genuinely free plan with no credit card, matching Tolt&apos;s
          lightweight ethos.
        </li>
        <li>
          <strong className="text-foreground">QR + bio included</strong> — codes
          for launch events and link-in-bio pages for creator affiliates.
        </li>
        <li>
          <strong className="text-foreground">Open source</strong> — inspect the
          code, self-host if you outgrow the cloud.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          ["Category", "Tolt: affiliate tracking · Slugy: link platform"],
          ["Commission payouts", "Tolt"],
          ["Branded links + QR", "Slugy"],
          ["Per-link click analytics", "Slugy"],
          ["Free starting tier", "Both start free — compare limits"],
        ]}
      />

      <Shot
        src="/images/features/f3_converted.webp"
        alt="Slugy QR code designer with brand colors and styles"
        caption="Branded QR codes for launch events, styled to match each affiliate."
        width={1270}
        height={960}
      />

      <H2 id="pricing">Pricing side by side</H2>
      <P>
        Tolt starts around $29/month for lightweight affiliate tracking. Slugy
        starts free — branded links, QR, and analytics at $0 with no credit card
        — and Pro is $8/month ($5/month forever with GETPRO) when you need
        volume and signup attribution.
      </P>
      <PricingTable
        competitor="Tolt"
        rows={[
          [
            "Entry",
            "Slugy Free $0 — 10 links/mo, 1k clicks/mo, QR + bio",
            "Tolt free tier — limited affiliates to start",
          ],
          [
            "Paid start",
            "Slugy Pro $8/mo ($5/mo forever with GETPRO) — 250 links/mo",
            "Tolt from ~$29/mo — affiliate tracking + payouts",
          ],
        ]}
        note="Prices change often — checked September 2026. Verify Tolt's current pricing page; Slugy numbers are from slugy.co/pricing."
      />

      <H2 id="setup">Setting them up together</H2>
      <Steps
        items={[
          <>
            <strong className="text-foreground">Start both free.</strong> Launch
            the Tolt program and create your first branded Slugy links the same
            afternoon.
          </>,
          <>
            <strong className="text-foreground">
              Brand every partner share.
            </strong>{" "}
            Your domain on each affiliate link, with QR codes for launch events
            and bio pages for creators.
          </>,
          <>
            <strong className="text-foreground">Measure upstream.</strong>{" "}
            Per-link clicks show what affiliates drive before Tolt reports
            commissions.
          </>,
          <>
            <strong className="text-foreground">Upgrade only one side.</strong>{" "}
            Most lean setups pay for Tolt and run links on Slugy&apos;s free
            plan until volume demands Pro.
          </>,
        ]}
      />

      <H2 id="verdict">Verdict</H2>
      <P>
        For a lean SaaS affiliate setup, pair Tolt&apos;s commissions with
        Slugy&apos;s links. Both respect a startup budget, and together they
        cover click to payout.
      </P>
      <Cta />
    </article>
  );
}
