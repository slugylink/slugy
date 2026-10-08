import Link from "next/link";
import type { ReactNode } from "react";

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="text-foreground mt-12 scroll-mt-24 text-xl font-semibold tracking-tight sm:text-2xl"
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground mt-4 text-[15px] leading-7 sm:text-base">
      {children}
    </p>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="border-border bg-muted/40 text-foreground mt-6 rounded-lg border px-4 py-3 text-sm leading-6">
      {children}
    </aside>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="bg-muted text-foreground rounded px-1.5 py-0.5 text-[13px]">
      {children}
    </code>
  );
}

function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="text-muted-foreground mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 sm:text-base">
      {children}
    </ul>
  );
}

function Ol({ children }: { children: ReactNode }) {
  return (
    <ol className="text-muted-foreground mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 sm:text-base">
      {children}
    </ol>
  );
}

export default function TrackRevenueWithShortLinksPost() {
  return (
    <article className="prose-slugy">
      <P>
        A short link that reports 10,000 clicks tells you almost nothing: did
        anyone sign up, buy, or book? Revenue tracking closes that gap by
        attributing leads and sales back to the exact link — campaign, channel,
        influencer, or QR code — that drove them. This guide walks through the
        full setup on Slugy, from account to revenue report.
      </P>

      <Callout>
        Click analytics work on every plan. Lead conversion tracking needs{" "}
        <strong>Pro</strong>; sales and revenue analytics need{" "}
        <strong>Growth</strong>. See{" "}
        <Link
          href="/pricing"
          className="text-foreground underline underline-offset-4"
        >
          pricing
        </Link>{" "}
        for limits.
      </Callout>

      <H2 id="why-clicks-are-not-enough">
        Why traditional click tracking is not enough
      </H2>
      <P>
        Two links can each earn 1,000 clicks while driving wildly different
        revenue — one converts at 1%, the other at 5%. Click-only dashboards
        call them equal and your budget follows the wrong link. Revenue tracking
        adds the missing columns: conversions, conversion rate, and dollars per
        slug, so spend follows outcomes instead of traffic.
      </P>

      <H2 id="setup">Setting up your Slugy account</H2>
      <Ol>
        <li>
          <Link
            href="https://app.slugy.co/signup"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Create a free workspace
          </Link>{" "}
          — no credit card required.
        </li>
        <li>
          Connect a custom domain in <strong>Settings → Domains</strong> with
          the guided DNS setup, so links read as yourbrand.co/sale.
        </li>
        <li>
          Create one branded short link per campaign surface (ad, email,
          influencer, QR), and tag each with UTM source, medium, and campaign
          using the{" "}
          <Link
            href="/tools/utm-builder"
            className="text-foreground font-medium underline underline-offset-4"
          >
            free UTM builder
          </Link>{" "}
          so GA4 and Slugy agree.
        </li>
      </Ol>

      <H2 id="enable-tracking">Enabling conversion tracking</H2>
      <P>
        Toggle <strong className="text-foreground">Lead tracking</strong> on
        each link (Pro and up). From then on, clicks append{" "}
        <InlineCode>slugy_id</InlineCode> to your destination URL. Persist that
        id in a first-party cookie on your site, then POST it back from your
        server when the visitor converts. The complete code-level walkthrough is
        in{" "}
        <Link
          href="/blogs/lead-conversion-tracking"
          className="text-foreground font-medium underline underline-offset-4"
        >
          how to track link conversions
        </Link>{" "}
        — every integration below builds on that same click id.
      </P>

      <H2 id="integrations">Integrating with your existing tools</H2>
      <P>Three connections cover most teams:</P>
      <Ul>
        <li>
          <strong className="text-foreground">Shopify (Growth)</strong> — a web
          pixel captures <InlineCode>slugy_click_id</InlineCode> at checkout and
          posts the order to Slugy. Full steps in{" "}
          <Link
            href="/integrations/shopify"
            className="text-foreground font-medium underline underline-offset-4"
          >
            integrating Slugy with Shopify
          </Link>
          .
        </li>
        <li>
          <strong className="text-foreground">Zapier / Make</strong> — forward{" "}
          <InlineCode>lead.created</InlineCode> and{" "}
          <InlineCode>sale.created</InlineCode> webhooks to a catch hook and
          update your CRM, Sheets, or email flows. See{" "}
          <Link
            href="/integrations/zapier"
            className="text-foreground font-medium underline underline-offset-4"
          >
            the Zapier guide
          </Link>
          .
        </li>
        <li>
          <strong className="text-foreground">Slack</strong> — real-time lead
          and sale alerts plus a <InlineCode>/shorten</InlineCode> slash
          command, covered in{" "}
          <Link
            href="/blogs/slugy-integrations"
            className="text-foreground font-medium underline underline-offset-4"
          >
            the integrations overview
          </Link>
          .
        </li>
      </Ul>

      <H2 id="analyze">Analyzing your revenue data</H2>
      <P>
        Open <strong className="text-foreground">Analytics</strong> in your
        workspace and switch the metric from Clicks to Leads or Sales. Filter by
        link, country, device, and time range. Compare dollars per link across
        influencers, ads, and emails; kill the spend that clicks but never
        converts. Route <InlineCode>sale.created</InlineCode> to Slack for
        instant visibility when big orders land.
      </P>

      <H2 id="advanced">Advanced features for power users</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Custom domains</strong> per
          workspace keep every surface on-brand.
        </li>
        <li>
          <strong className="text-foreground">
            Link expiration and password protection
          </strong>{" "}
          time-box promos and gate drops.
        </li>
        <li>
          <strong className="text-foreground">Geo targeting</strong> routes
          visitors to regional checkouts while attribution stays unified.
        </li>
        <li>
          <strong className="text-foreground">QR codes</strong> on packaging and
          posters inherit the same tracking — shorten first, then generate the
          QR from the short link.
        </li>
      </Ul>

      <H2 id="get-started">Get started</H2>
      <P>
        Create one tracking-enabled link today, wire the cookie snippet from the
        conversion guide, and let the next campaign report revenue — not just
        clicks.
      </P>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="https://app.slugy.co/signup"
          className="bg-foreground text-background inline-flex h-10 items-center rounded-md px-4 text-sm font-medium"
        >
          Start tracking revenue
        </Link>
        <Link
          href="/blogs/lead-conversion-tracking"
          className="border-border text-foreground inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
        >
          Conversion tracking guide
        </Link>
      </div>
    </article>
  );
}
