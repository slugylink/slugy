import { Callout, Cta, Facts, H2, P, Ul } from "./_compare";

export default function SlugyVsShortIoPost() {
  return (
    <article className="prose-slugy">
      <P>
        Short.io targets teams that need white-label links at scale — custom
        domains, deep linking, and API-driven workflows. Slugy is the
        lighter-weight alternative: branded links, QR codes, bio pages, and
        analytics in one free-to-start, open-source workspace.
      </P>

      <Callout>
        <strong>TL;DR:</strong> Short.io suits API-heavy, white-label setups.
        Slugy suits teams and creators who want links, QR, bio, and conversions
        live the same afternoon.
      </Callout>

      <H2 id="what-shortio-does-best">What Short.io does best</H2>
      <P>
        Short.io leans into white-labeling and developer workflows: custom
        domains everywhere, mobile deep links, and API-first link operations for
        larger catalogs. Teams embedding links into their own product surfaces
        are its core users.
      </P>

      <H2 id="where-slugy-differs">Where Slugy differs</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Faster setup</strong> — custom
          domain, branded links, and QR codes live in minutes, no implementation
          project.
        </li>
        <li>
          <strong className="text-foreground">Bio pages included</strong> — a
          link-in-bio page with per-button analytics on your own domain.
        </li>
        <li>
          <strong className="text-foreground">Lead conversion tracking</strong>{" "}
          — attribute signups and purchases to the link on Pro.
        </li>
        <li>
          <strong className="text-foreground">Open source + free plan</strong> —
          public codebase, free start with no credit card, plus API keys when
          you need automation.
        </li>
      </Ul>

      <H2 id="at-a-glance">At a glance</H2>
      <Facts
        rows={[
          ["Category", "Both are branded link platforms"],
          ["API access", "Both offer API keys"],
          ["Bio / link-in-bio", "Included in Slugy"],
          ["Lead conversion tracking", "Included in Slugy Pro"],
          ["Open source", "Slugy is open source"],
        ]}
      />

      <H2 id="migrating">Migrating from Short.io to Slugy</H2>
      <P>
        Export your links, reconnect your custom domain in Slugy, and import via
        CSV. If you rely on mobile deep-link routing, verify Slugy covers your
        schemes before moving production traffic.
      </P>

      <H2 id="verdict">Verdict</H2>
      <P>
        Short.io for white-label infrastructure; Slugy for speed and breadth —
        one workspace for links, QR, bio, analytics, and conversions.
      </P>
      <Cta />
    </article>
  );
}
