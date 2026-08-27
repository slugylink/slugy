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

function H3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3
      id={id}
      className="text-foreground mt-8 scroll-mt-24 text-lg font-medium tracking-tight"
    >
      {children}
    </h3>
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

function Ol({ children }: { children: ReactNode }) {
  return (
    <ol className="text-muted-foreground mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 sm:text-base">
      {children}
    </ol>
  );
}

function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="text-muted-foreground mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 sm:text-base">
      {children}
    </ul>
  );
}

export default function LeadConversionTrackingPost() {
  return (
    <article className="prose-slugy">
      <P>
        Clicks tell you who visited. Leads tell you who converted — signed up,
        clicked Buy Now, or joined a waitlist. Slugy attributes those actions
        back to the short link that brought them in.
      </P>

      <Callout>
        Lead tracking uses a <InlineCode>slugy_id</InlineCode> on redirect, a
        first-party cookie on <strong>your</strong> site, and a server-side{" "}
        <InlineCode>POST</InlineCode> to{" "}
        <InlineCode>https://api.slugy.co/leads_track</InlineCode>.
      </Callout>

      <H2 id="how-it-works">How lead conversion works</H2>
      <P>The flow is three steps:</P>
      <Ol>
        <li>
          <strong className="text-foreground">Click</strong> — someone opens
          your Slugy short link.
        </li>
        <li>
          <strong className="text-foreground">Attribution</strong> — Slugy
          redirects to your site with <InlineCode>?slugy_id=…</InlineCode> in
          the URL.
        </li>
        <li>
          <strong className="text-foreground">Lead</strong> — when they convert,
          your backend sends that ID to Slugy with the customer details.
        </li>
      </Ol>

      <H2 id="step-1">Step 1: Create an API key</H2>
      <Ol>
        <li>
          Open your workspace →{" "}
          <Link
            href="https://app.slugy.co"
            className="text-foreground font-medium underline underline-offset-4"
          >
            Settings → API Keys
          </Link>
          .
        </li>
        <li>Create a key and copy it once (it won&apos;t be shown again).</li>
        <li>
          Store it as <InlineCode>SLUGY_API_KEY</InlineCode> in your server
          environment — never in browser JavaScript.
        </li>
      </Ol>

      <H2 id="step-2">Step 2: Share the short link</H2>
      <P>
        Point a Slugy link at your landing page (portfolio, signup, checkout).
        Visitors must arrive through that short link so Slugy can attach{" "}
        <InlineCode>slugy_id</InlineCode>.
      </P>
      <P>Example redirect destination after a click:</P>
      <Code>{`https://yoursite.com/pricing?slugy_id=clx_abc123…`}</Code>

      <H2 id="step-3">Step 3: Add slugy helpers on your app</H2>
      <P>
        Slugy cannot set a cookie on your domain. Add two small files on your
        app: one to read the id, one to capture it into a first-party cookie on
        first landing.
      </P>

      <H3 id="slugy-ts">
        <InlineCode>lib/slugy.ts</InlineCode>
      </H3>
      <Code>{`const COOKIE = "slugy_id";

/** Read attribution id from query (first hit) or first-party cookie. */
export function getSlugyId(): string | null {
  if (typeof window === "undefined") return null;

  const fromQuery = new URLSearchParams(window.location.search).get("slugy_id");
  if (fromQuery) return fromQuery;

  const match = document.cookie.match(
    new RegExp(\`(?:^|;\\\\s*)\${COOKIE}=([^;]*)\`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function setSlugyIdCookie(id: string, maxAge = 60 * 60 * 24 * 90) {
  document.cookie = \`\${COOKIE}=\${encodeURIComponent(id)}; path=/; max-age=\${maxAge}; SameSite=Lax\`;
}

export { COOKIE as SLUGY_ID_COOKIE };`}</Code>

      <H3 id="capture-slugy-id">
        <InlineCode>components/capture-slugy-id.tsx</InlineCode>
      </H3>
      <Code>{`"use client";

import { useEffect } from "react";
import { getSlugyId, setSlugyIdCookie } from "@/lib/slugy";

/** Persist slugy_id from the redirect URL as a first-party cookie. */
export function CaptureSlugyId() {
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("slugy_id");
    if (!id) return;

    setSlugyIdCookie(id);

    const url = new URL(window.location.href);
    url.searchParams.delete("slugy_id");
    window.history.replaceState({}, "", url.toString());
  }, []);

  return null;
}

// Optional: re-export helper for Buy Now / signup handlers
export { getSlugyId };`}</Code>
      <P>
        Mount <InlineCode>&lt;CaptureSlugyId /&gt;</InlineCode> in your root
        layout so every landing page captures attribution. Use{" "}
        <InlineCode>getSlugyId()</InlineCode> later when tracking a lead.
      </P>

      <H2 id="step-4">Step 4: Track the lead from your server</H2>
      <P>
        When the conversion happens (Buy Now, signup, form submit), call Slugy
        from a server route or backend — not from the client with a secret key.
      </P>

      <H3 id="api">API</H3>
      <Code>{`POST https://api.slugy.co/leads_track
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}</Code>

      <div className="border-border mt-6 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-muted/50 text-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Property</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Required</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-border border-t">
              <td className="px-3 py-2">
                <InlineCode>clickId</InlineCode>
              </td>
              <td className="px-3 py-2">
                The <InlineCode>slugy_id</InlineCode> from the URL/cookie
              </td>
              <td className="px-3 py-2">Yes</td>
            </tr>
            <tr className="border-border border-t">
              <td className="px-3 py-2">
                <InlineCode>eventName</InlineCode>
              </td>
              <td className="px-3 py-2">
                e.g. <InlineCode>buy_now</InlineCode>,{" "}
                <InlineCode>sign_up</InlineCode>
              </td>
              <td className="px-3 py-2">Yes</td>
            </tr>
            <tr className="border-border border-t">
              <td className="px-3 py-2">
                <InlineCode>customerExternalId</InlineCode>
              </td>
              <td className="px-3 py-2">
                Stable ID in your system (user id / email)
              </td>
              <td className="px-3 py-2">Yes</td>
            </tr>
            <tr className="border-border border-t">
              <td className="px-3 py-2">
                <InlineCode>customerEmail</InlineCode>
              </td>
              <td className="px-3 py-2">Customer email</td>
              <td className="px-3 py-2">No</td>
            </tr>
            <tr className="border-border border-t">
              <td className="px-3 py-2">
                <InlineCode>customerName</InlineCode>
              </td>
              <td className="px-3 py-2">Customer name</td>
              <td className="px-3 py-2">No</td>
            </tr>
            <tr className="border-border border-t">
              <td className="px-3 py-2">
                <InlineCode>metadata</InlineCode>
              </td>
              <td className="px-3 py-2">Extra JSON (plan, source, etc.)</td>
              <td className="px-3 py-2">No</td>
            </tr>
          </tbody>
        </table>
      </div>

      <H3 id="nextjs-route">Next.js example</H3>
      <Code>{`// app/api/track-lead/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.SLUGY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing SLUGY_API_KEY" }, { status: 500 });
  }

  const { clickId, customerExternalId, customerEmail, customerName } =
    await req.json();

  if (!clickId || !customerExternalId) {
    return NextResponse.json(
      { error: "clickId and customerExternalId required" },
      { status: 400 },
    );
  }

  const res = await fetch("https://api.slugy.co/leads_track", {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clickId,
      eventName: "buy_now",
      customerExternalId,
      customerEmail,
      customerName,
      metadata: { source: "portfolio" },
    }),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}`}</Code>

      <P>From your Buy Now / signup handler on the client:</P>
      <Code>{`import { getSlugyId } from "@/lib/slugy";

async function onBuyNow() {
  const clickId = getSlugyId();
  if (!clickId) return; // organic visit — no Slugy attribution

  await fetch("/api/track-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clickId,
      customerExternalId: email,
      customerEmail: email,
      customerName: name,
    }),
  });
}`}</Code>

      <H2 id="analytics">Where to see leads</H2>
      <Ul>
        <li>
          Open <strong className="text-foreground">Analytics</strong> in your
          workspace.
        </li>
        <li>
          Switch to the <strong className="text-foreground">Leads</strong> tab
          (fetched only when you open it).
        </li>
        <li>
          Filter by link, country, device, and time range like click analytics.
        </li>
      </Ul>

      <H2 id="tips">Tips</H2>
      <Ul>
        <li>
          Same <InlineCode>customerExternalId</InlineCode> +{" "}
          <InlineCode>eventName</InlineCode> is idempotent — won&apos;t
          double-count.
        </li>
        <li>
          <InlineCode>slugy_id</InlineCode> attribution lasts 90 days in Redis
          (and as long as you keep the cookie).
        </li>
        <li>
          Always track after the action succeeds on your backend (paid, signed
          up, etc.).
        </li>
      </Ul>

      <H2 id="get-started">Get started</H2>
      <P>
        Create a short link, add the cookie snippet, and wire{" "}
        <InlineCode>leads_track</InlineCode> on your next conversion event.
      </P>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="https://app.slugy.co"
          className="bg-foreground text-background inline-flex h-10 items-center rounded-md px-4 text-sm font-medium"
        >
          Open dashboard
        </Link>
        <Link
          href="/blogs"
          className="border-border text-foreground inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
        >
          All posts
        </Link>
      </div>
    </article>
  );
}
