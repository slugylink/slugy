import {
  Callout,
  Checked,
  Cta,
  Disclosure,
  H2,
  P,
  PricingTable,
  Related,
  Steps,
  Ul,
} from "./_compare";

export default function SlugyVsDubPost() {
  return (
    <article className="prose-slugy">
      <P>
        This is the comparison where Slugy has the least room to argue, because
        Dub.co is also open source and also excellent. Both handle branded
        links, custom domains, QR codes, and click analytics. If that is all you
        need, either is defensible and you should pick on the extras.
      </P>

      <Callout>
        <strong>Short version:</strong> Dub.co is the more mature project, with
        a large community, extensive docs, and a well-known API. Slugy is the
        one that bundles a link-in-bio page and signup/purchase attribution into
        the same workspace and free-to-start plan. Dub.co also has a bio-link
        feature now — compare the plan tiers before assuming it does not.
      </Callout>

      <Disclosure />

      <H2 id="what-dub-does-better">What Dub.co does better</H2>
      <P>
        Dub.co has been the reference implementation in this category for
        longer. That gap is not cosmetic:
      </P>
      <Ul>
        <li>
          <strong className="text-foreground">Ecosystem depth</strong> — a large
          open-source community, extensive documentation, and an API that plenty
          of third-party tools already integrate against.
        </li>
        <li>
          <strong className="text-foreground">Maturity</strong> — more edge
          cases handled, more history of uptime behavior, a longer track record
          when something goes sideways.
        </li>
        <li>
          <strong className="text-foreground">Name recognition</strong> — if you
          are hiring or building internal tooling, &ldquo;we use Dub&rdquo; is a
          shorter conversation than explaining an unfamiliar codebase.
        </li>
        <li>
          <strong className="text-foreground">Self-hosting precedent</strong> —
          AGPLv3 with an established community of operators running their own
          instances.
        </li>
      </Ul>
      <P>
        If you already run Dub, or you have built around its API, there is no
        reason to move. Migration cost is not only technical; it is the tribal
        knowledge your team has accumulated.
      </P>

      <H2 id="pricing">Pricing, side by side</H2>
      <P>
        Both products have a free tier and both charge for the jump to real
        volume. The difference is what sits behind the paywall.
      </P>
      <PricingTable
        competitor="Dub.co"
        rows={[
          [
            "Free tier",
            "$0 — 10 new links/mo, 1k tracked clicks/mo, 1 custom domain",
            "$0 — 25 links/mo, 1k events/mo, 3 custom domains",
          ],
          [
            "Custom domains",
            "1 on Free, up to 10 on Growth",
            "3 on free, more on paid tiers",
          ],
          [
            "Lead / revenue attribution",
            "Pro ($8/mo) for leads, Growth ($29/mo) for revenue",
            "Business ($90/mo) and up (lead + sale events)",
          ],
          [
            "Bio pages",
            "Included — 5 links on Free, up to 30 on Growth",
            "Included on paid tiers; check current free allowance",
          ],
          ["License", "Public source on GitHub", "AGPLv3"],
        ]}
        note="Slugy pricing from our own pricing page; Dub.co Links figures from dub.co/pricing/links on 2026-10-09. Both move these numbers regularly — verify before deciding."
      />
      <Checked date="9 October 2026" />

      <H2 id="what-slugy-does-differently">Where Slugy differs</H2>
      <Ul>
        <li>
          <strong className="text-foreground">
            Leads and revenue in one tool, at a startup price
          </strong>{" "}
          — click-to-signup attribution is on Pro at $8/mo and revenue
          attribution on Growth at $29/mo. Dub.co also tracks leads and sales,
          starting at Business ($90/mo) — so the difference is entry price and
          simplicity, not capability.
        </li>
        <li>
          <strong className="text-foreground">
            Lower entry point for volume
          </strong>{" "}
          — if you need real link volume rather than a large number of custom
          domains, Pro gets you 250 links per workspace for less than most
          business tiers.
        </li>
        <li>
          <strong className="text-foreground">Simpler surface</strong> — a
          smaller feature set you can hold in your head, with fewer enterprise
          configuration layers to work through.
        </li>
      </Ul>

      <H2 id="honest-tradeoffs">The honest tradeoffs</H2>
      <Ul>
        <li>
          <strong className="text-foreground">
            Community size is a real asset and Slugy has less of it.
          </strong>{" "}
          Dub&apos;s issue tracker and Discord answer questions faster. If you
          rely on community support, factor that in — Slugy offers priority
          email support on paid plans instead.
        </li>
        <li>
          <strong className="text-foreground">Fewer integrations.</strong> Tools
          that assume Dub&apos;s API may need work to point at Slugy&apos;s.
        </li>
        <li>
          <strong className="text-foreground">A smaller track record.</strong>{" "}
          If uptime history is a requirement, ask us and we will show you what
          we have rather than implying parity.
        </li>
      </Ul>

      <H2 id="migrating">Moving from Dub.co to Slugy</H2>
      <Steps
        items={[
          <>
            <strong className="text-foreground">Export your links.</strong> Take
            the CSV export before you cancel anything, so you have a clean
            source of truth.
          </>,
          <>
            <strong className="text-foreground">Connect the domain.</strong> Add
            your custom domain in Slugy and follow the DNS instructions. Because
            both are open source, you can inspect both data models first if you
            want to understand the mapping before committing.
          </>,
          <>
            <strong className="text-foreground">Import and reconcile.</strong>{" "}
            Import the CSV, then read the collision report — slugs that already
            exist get regenerated, so note anything that moved.
          </>,
          <>
            <strong className="text-foreground">Cut over gradually.</strong>{" "}
            Keep your highest-traffic links on Dub until click counts in Slugy
            roughly match for a week.
          </>,
        ]}
      />

      <H2 id="verdict">Verdict</H2>
      <P>
        Both are legitimately open source, so the openness argument does not
        decide this. Choose <strong className="text-foreground">Dub.co</strong>{" "}
        for ecosystem maturity, docs, and integrations. Choose{" "}
        <strong className="text-foreground">Slugy</strong> if lead and revenue
        attribution at a startup price point matters more than community size,
        or if you want the whole link-to-signup picture in one tool instead of
        two.
      </P>

      <Related
        items={[
          {
            href: "/blogs/slugy-vs-bitly",
            label: "Slugy vs Bitly",
            note: "the enterprise comparison, including an honest list of what Slugy lacks",
          },
          {
            href: "/blogs/slugy-vs-rebrandly",
            label: "Slugy vs Rebrandly",
            note: "branding-first versus analytics-first",
          },
          {
            href: "/blogs/slugy-vs-short-io",
            label: "Slugy vs Short.io",
            note: "when API scale beats setup speed",
          },
        ]}
      />
      <Cta />
    </article>
  );
}
