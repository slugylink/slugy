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

function Code({ children }: { children: string }) {
  return (
    <pre className="border-border mt-4 overflow-x-auto rounded-lg border bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100">
      <code>{children.trim()}</code>
    </pre>
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

export default function SlugyIntegrationsPost() {
  return (
    <article className="prose-slugy">
      <P>
        Short links collect clicks. Integrations turn those clicks into action:
        a Slack ping the moment someone converts, a Zapier workflow that adds
        them to your CRM, and revenue attribution that ties Polar and Shopify
        orders back to the link that brought the buyer. Everything below lives
        in <strong className="text-foreground">Settings → Integrations</strong>{" "}
        in your workspace.
      </P>

      <Callout>
        Lead events (<InlineCode>lead.created</InlineCode>) need a{" "}
        <strong>Pro</strong> workspace; revenue events (
        <InlineCode>sale.created</InlineCode>) need <strong>Growth</strong>. If
        you have not set up conversion tracking yet, read{" "}
        <Link
          href="/blogs/lead-conversion-tracking"
          className="text-foreground underline underline-offset-4"
        >
          the lead tracking guide
        </Link>{" "}
        first — every integration here builds on the{" "}
        <InlineCode>slugy_id</InlineCode> click id.
      </Callout>

      <H2 id="slack">Slack: notifications and /shorten</H2>
      <P>
        Connect once and two things start working: real-time messages for new
        leads and sales, and a <InlineCode>/shorten</InlineCode> slash command
        that creates branded links without leaving chat.
      </P>
      <Ol>
        <li>
          Open{" "}
          <strong className="text-foreground">Settings → Integrations</strong>{" "}
          and click <strong className="text-foreground">Connect</strong> on the
          Slack card. Pick the channel that should receive notifications during
          the Slack install screen.
        </li>
        <li>
          In that channel, run <InlineCode>/invite @slug</InlineCode> — Slack
          blocks bot posts to channels the app has not joined, and the error is
          silent on your side.
        </li>
        <li>
          Click <strong className="text-foreground">Send test</strong> on the
          Slack card. A test message in the channel means the token, the
          channel, and delivery all work; any failure names its reason (for
          example <InlineCode>not_in_channel</InlineCode>).
        </li>
      </Ol>
      <P>
        For <InlineCode>/shorten</InlineCode>, create the slash command in your
        Slack app settings pointing at{" "}
        <InlineCode>
          https://app.slugy.co/api/integrations/slack/commands
        </InlineCode>
        , reinstall the app, then type{" "}
        <InlineCode>/shorten https://example.com</InlineCode> in any channel.
        Commands resolve to your workspace by Slack team, so one team can never
        create links in another workspace.
      </P>

      <H2 id="webhooks">Outbound webhooks: Zapier, Make, Segment</H2>
      <P>
        Every <InlineCode>lead.created</InlineCode> and{" "}
        <InlineCode>sale.created</InlineCode> event can fan out to any HTTPS
        endpoint — a Zapier catch hook, a Make custom webhook, Segment, or your
        own server. Add one from the{" "}
        <strong className="text-foreground">Webhooks</strong> card with{" "}
        <strong className="text-foreground">Add webhook</strong>, pick the
        events, and copy the signing secret (shown once).
      </P>
      <P>A delivery looks like this:</P>
      <Code>{`POST https://hooks.zapier.com/hooks/catch/… HTTP/1.1
slugy-timestamp: 1728123456
slugy-signature: v1=9f2c…
content-type: application/json

{
  "event": "lead.created",
  "workspaceId": "…",
  "createdAt": "2026-10-05T…Z",
  "data": {
    "slug": "launch",
    "clickId": "…",
    "customerEmail": "buyer@example.com",
    "saleAmount": 49,
    "saleCurrency": "USD"
  }
}`}</Code>
      <P>
        Verify the signature as{" "}
        <InlineCode>
          HMAC_SHA256(secret, timestamp + &quot;.&quot; + body)
        </InlineCode>{" "}
        and reject timestamps older than five minutes. Endpoints can be paused
        with the toggle and removed anytime; failed deliveries are kept for
        debugging and old ones are purged automatically.
      </P>

      <H2 id="polar">Polar: attribute orders to clicks</H2>
      <P>
        If you sell through Polar, pass the visitor&apos;s{" "}
        <InlineCode>slugy_click_id</InlineCode> in the checkout metadata or
        custom data. When the order is created or paid, Slugy records a{" "}
        <InlineCode>sale</InlineCode> event against the original link,
        increments its conversions, and fires{" "}
        <InlineCode>sale.created</InlineCode> to your webhooks and Slack.
      </P>
      <Ul>
        <li>Capture the id from the URL or the first-party cookie you set.</li>
        <li>
          Include it as <InlineCode>slugy_click_id</InlineCode> (also accepted:{" "}
          <InlineCode>slugyClickId</InlineCode>,{" "}
          <InlineCode>slugy_id</InlineCode>) in the checkout payload.
        </li>
        <li>
          No separate install step — attribution is automatic once the id is
          present.
        </li>
      </Ul>

      <H2 id="shopify">Shopify: web pixel to sale</H2>
      <P>
        Add a web pixel (or a Flow connector) that captures{" "}
        <InlineCode>slugy_click_id</InlineCode> at checkout and posts the order
        to Slugy:
      </P>
      <Code>{`POST /api/integrations/shopify/order
Authorization: Bearer <leads-write API key>
Content-Type: application/json

{
  "clickId": "…",
  "orderId": "gid://shopify/Order/123",
  "customerEmail": "buyer@example.com",
  "saleAmount": 49,
  "saleCurrency": "USD"
}`}</Code>
      <P>
        Authentication is required: either a shared HMAC secret or a workspace
        API key with leads-write scope, which also binds the sale to that
        key&apos;s workspace. Unknown clicks return <InlineCode>404</InlineCode>
        ; non-Growth workspaces get <InlineCode>403</InlineCode> for revenue
        fields.
      </P>

      <H2 id="wordpress">WordPress: auto-shorten on publish</H2>
      <P>
        Install the Slugy plugin, paste a{" "}
        <strong className="text-foreground">Links-write</strong> API key from{" "}
        <strong className="text-foreground">Settings → API Keys</strong>, and
        turn on auto-shorten. Every post gets its short link stored as post
        metadata and shown in the editor sidebar — publish once, track
        everything.
      </P>

      <H2 id="api-keys">API keys and scopes</H2>
      <P>Two scopes cover every integration above:</P>
      <Ul>
        <li>
          <strong className="text-foreground">Links-write</strong> — create
          short links (WordPress plugin, Make/Zapier actions,{" "}
          <InlineCode>/shorten</InlineCode> internals). Works on any plan;
          quotas still apply.
        </li>
        <li>
          <strong className="text-foreground">Leads-write</strong> — record
          leads and sales (Pro for leads, Growth for revenue). Required by the
          Shopify endpoint when no shared secret is set.
        </li>
      </Ul>

      <H2 id="get-started">Get started</H2>
      <P>
        Connect Slack for instant visibility today, add one webhook to feed
        Zapier or Make, and pass the click id through your checkout to unlock
        revenue attribution.
      </P>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="https://app.slugy.co"
          className="bg-foreground text-background inline-flex h-10 items-center rounded-md px-4 text-sm font-medium"
        >
          Open dashboard
        </Link>
        <Link
          href="/blogs/lead-conversion-tracking"
          className="border-border text-foreground inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
        >
          Lead tracking guide
        </Link>
      </div>
    </article>
  );
}
