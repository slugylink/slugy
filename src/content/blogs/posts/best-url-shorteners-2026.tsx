import Link from "next/link";
import {
  Callout,
  Checked,
  Cta,
  Disclosure,
  H2,
  P,
  Related,
  Ul,
} from "./_compare";

const ROWS: Array<{
  tool: string;
  bestFor: string;
  price: string;
  free: string;
  attribution: string;
  open: string;
}> = [
  {
    tool: "Slugy",
    bestFor: "Startups that need attribution cheap",
    price: "$0 / $8 / $29 / $199",
    free: "10 links/mo, 1k clicks, 1 domain",
    attribution: "Leads from $8, revenue from $29",
    open: "MIT",
  },
  {
    tool: "Dub.co",
    bestFor: "Ecosystem and API maturity",
    price: "$0 / $30 / $90+",
    free: "25 links/mo, 1K events, 3 domains",
    attribution: "Leads + sales from $90",
    open: "AGPLv3",
  },
  {
    tool: "Bitly",
    bestFor: "Enterprise procurement",
    price: "$0 / $10 / $29 / $199",
    free: "5 links/mo, 2 QR, 2 pages",
    attribution: "Not offered",
    open: "Proprietary",
  },
  {
    tool: "Short.io",
    bestFor: "Link volume and API scale",
    price: "$0 / $5 / $18 / $48 / $148",
    free: "1,000 links, 50K clicks/mo, 5 domains",
    attribution: "Conversions from free (50/mo)",
    open: "Proprietary",
  },
  {
    tool: "Rebrandly",
    bestFor: "Branding-first teams",
    price: "$0 / $8+ / $22+ / $104+",
    free: "10 links/mo, 10 QR, 1 domain",
    attribution: "Conversion tracking on paid tiers",
    open: "Proprietary",
  },
  {
    tool: "Cuttly",
    bestFor: "Click-analytics depth on a budget",
    price: "$0 / $12 / $25 / $99 / $149",
    free: "30 links/mo, 1 domain, 30-day history",
    attribution: "Click analytics + pixels only",
    open: "Proprietary",
  },
  {
    tool: "Kutt",
    bestFor: "Pure self-host minimalists",
    price: "Free (self-hosted)",
    free: "Full product, MIT-licensed",
    attribution: "Click stats only",
    open: "MIT",
  },
  {
    tool: "BL.INK",
    bestFor: "Regulated enterprise",
    price: "Custom (sales-led)",
    free: "No list pricing published",
    attribution: "Enterprise analytics",
    open: "Proprietary",
  },
];

const VERDICTS: Array<{ tool: string; body: string }> = [
  {
    tool: "1. Slugy — best value attribution",
    body: "The only tool here with lead tracking at $8 and revenue attribution at $29, MIT-licensed. Weaknesses, stated plainly: smaller ecosystem than Dub, shorter uptime history than Bitly, no SSO or contractual SLA.",
  },
  {
    tool: "2. Dub.co — best ecosystem",
    body: "The reference implementation: biggest community, deepest docs, most integrations. Conversion tracking is real but starts at $90/mo — pick Dub for maturity, Slugy for entry price.",
  },
  {
    tool: "3. Bitly — best enterprise buy",
    body: "A decade of hardening, SOC 2, SSO/SCIM, account teams. If procurement, compliance, or an SLA decides, stop here. Everyone else is overpaying for clicks.",
  },
  {
    tool: "4. Short.io — best volume play",
    body: "The most generous free tier measured (1,000 links, 50K tracked clicks/mo, 5 domains) and unlimited everything from Pro $18. API-first teams that live in dashboards should shortlist it.",
  },
  {
    tool: "5. Rebrandly — best branding surface",
    body: "Branding-first positioning with galleries, deep links, and conversion tracking on paid tiers. Free is thin (10 links/mo) — this is a paid product with a trial-shaped free tier.",
  },
  {
    tool: "6. Cuttly — best budget analytics",
    body: "Remarkably deep click analytics (heat maps, bot charts, PDF reports) from $12/mo, plus surveys and action pages most rivals lack. No lead/revenue attribution — clicks are the ceiling.",
  },
  {
    tool: "7. Kutt — best pure self-host",
    body: "11k stars, MIT, Docker-first, zero-config SQLite default. The minimalist's choice: custom domains, passwords, expiry, and stats with nothing to pay. No hosted analytics business behind it.",
  },
  {
    tool: "8. BL.INK — best regulated enterprise",
    body: "Compliance, admin controls, and sales-led onboarding for teams where link governance is the requirement. No public pricing — if you have to ask about list prices, this tier is not for you.",
  },
];

export default function BestUrlShortenersPost() {
  return (
    <article className="prose-slugy">
      <P>
        Eight shorteners, one table, dated pricing. Rankings follow our{" "}
        <Link
          href="/blogs/url-shortener-evaluation-criteria"
          className="text-foreground font-medium underline underline-offset-4"
        >
          published evaluation criteria
        </Link>{" "}
        — price-to-value and attribution depth weighted highest — so you can
        audit every verdict instead of trusting it.
      </P>

      <Callout>
        <strong>Bias disclosure:</strong> Slugy ranks first by a rubric that
        weights startup-price attribution highest — a rubric we publish so you
        can re-weight it. A compliance team applying these same criteria with
        reliability weighted first should pick Bitly or BL.INK.
      </Callout>

      <Disclosure />

      <H2 id="comparison-table">Side-by-side: top 8 URL shorteners for 2026</H2>
      <div className="border-border mt-6 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="bg-muted/40 text-foreground">
              <th className="px-3 py-2.5 font-medium">Tool</th>
              <th className="px-3 py-2.5 font-medium">Best for</th>
              <th className="px-3 py-2.5 font-medium">Starting price</th>
              <th className="px-3 py-2.5 font-medium">Free tier</th>
              <th className="px-3 py-2.5 font-medium">Attribution</th>
              <th className="px-3 py-2.5 font-medium">License</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {ROWS.map((r, i) => (
              <tr
                key={r.tool}
                className={i > 0 ? "border-border border-t" : undefined}
              >
                <td className="text-foreground px-3 py-2 font-medium">
                  {r.tool}
                </td>
                <td className="px-3 py-2">{r.bestFor}</td>
                <td className="px-3 py-2">{r.price}</td>
                <td className="px-3 py-2">{r.free}</td>
                <td className="px-3 py-2">{r.attribution}</td>
                <td className="px-3 py-2">{r.open}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Checked date="9 October 2026" />

      <H2 id="verdicts">Verdicts, tool by tool</H2>
      <Ul>
        {VERDICTS.map((v) => (
          <li key={v.tool}>
            <strong className="text-foreground">{v.tool}.</strong> {v.body}
          </li>
        ))}
      </Ul>

      <H2 id="how-to-choose">How to choose in five minutes</H2>
      <P>
        Answer three questions: (1) Do you need signups or revenue per link, or
        are clicks enough? (2) Is there a procurement department? (3) Will
        engineers self-host? Clicks-only + procurement → Bitly or BL.INK.
        Clicks-only + self-host → Kutt. Attribution under $30 → Slugy.
        Attribution with ecosystem → Dub. Volume + API → Short.io. Branding
        surface → Rebrandly. Deep click stats, tight budget → Cuttly.
      </P>

      <Related
        items={[
          {
            href: "/blogs/url-shortener-evaluation-criteria",
            label: "Our evaluation criteria",
            note: "the seven criteria and weights behind this ranking",
          },
          {
            href: "/alternative",
            label: "Slugy alternatives hub",
            note: "commercial summaries plus editorial reviews",
          },
          {
            href: "/blogs/slugy-vs-dub",
            label: "Slugy vs Dub.co",
            note: "the closest comparison, evaluated in depth",
          },
        ]}
      />
      <Cta />
    </article>
  );
}

export const BestUrlShortenersFaqs = [
  {
    q: "What is the best URL shortener in 2026?",
    a: "Depends on the job: Slugy for startup-price attribution ($8 leads, $29 revenue), Dub.co for ecosystem maturity, Bitly for enterprise procurement, Short.io for volume, Rebrandly for branding, Cuttly for budget analytics, Kutt for pure self-hosting, BL.INK for regulated teams.",
  },
  {
    q: "Which URL shortener has the best free plan?",
    a: "Short.io's free tier is the most generous measured (1,000 links, 50K tracked clicks/month, 5 custom domains). Dub.co offers 25 links and 3 domains free; Slugy 10 links with a domain; Bitly 5 links; Rebrandly 10 links; Cuttly 30 links.",
  },
  {
    q: "Which shorteners track revenue, not just clicks?",
    a: "Slugy (Growth $29/mo), Dub.co (Business $90/mo), and Rebrandly (paid tiers with conversion tracking). Short.io tracks conversions with generous free allowances. Bitly, Kutt, Cuttly, and BL.INK's public tiers center on click analytics.",
  },
  {
    q: "Which URL shorteners are open source?",
    a: "Slugy (MIT), Dub.co (AGPLv3), and Kutt (MIT) are open source with self-hosting paths. Bitly, Short.io, Rebrandly, Cuttly, and BL.INK are proprietary.",
  },
];
