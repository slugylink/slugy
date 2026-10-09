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

export default function QrCodeAnalyticsPost() {
  return (
    <article className="prose-slugy">
      <P>
        Most QR generators hand you an image and stop there — no idea how many
        people scanned, let alone whether they converted. Pair Slugy&apos;s{" "}
        <Link
          href="/tools/qr-code-generator"
          className="text-foreground font-medium underline underline-offset-4"
        >
          free QR code generator
        </Link>{" "}
        with a tracked short link and every scan becomes measurable: scans over
        time, converting links, and (on Pro/Growth) leads and revenue per code.
      </P>

      <Callout>
        The trick is order of operations:{" "}
        <strong>shorten first, generate second</strong>. A generated QR image is
        static — the pixels never change — but a short link behind it stays
        editable, so create a branded short link with analytics, then paste that
        short URL into the QR generator. Scans then flow through your link
        analytics automatically.
      </Callout>

      <H2 id="how-it-works">How QR analytics work</H2>
      <P>
        A QR code is just an encoded URL. When that URL is a Slugy short link,
        opening it registers a click with device, country, and referrer data —
        the same analytics any short-link click gets. One QR per surface (one
        for the poster, one for packaging, one for the conference badge) means
        per-placement scan counts instead of one blended number.
      </P>

      <H2 id="account">Do I need an account to track scans?</H2>
      <P>
        Generating the QR image itself needs nothing — the{" "}
        <Link
          href="/tools/qr-code-generator"
          className="text-foreground font-medium underline underline-offset-4"
        >
          QR generator
        </Link>{" "}
        runs free with no login. Measurement is what needs the account: the
        short link behind the code must live in a Slugy workspace so scans have
        somewhere to report to. The free workspace covers branded links and
        click-level scan analytics; lead attribution is Pro and revenue
        attribution is Growth, exactly as with any other short link.
      </P>

      <H2 id="step-by-step">Step by step: tracked QR codes</H2>
      <Ol>
        <li>
          Create a short link in{" "}
          <Link
            href="https://app.slugy.co/signup"
            className="text-foreground font-medium underline underline-offset-4"
          >
            your Slugy workspace
          </Link>{" "}
          for each placement — e.g. yourbrand.co/menu-spring. Turn on{" "}
          <strong className="text-foreground">Lead tracking</strong> (Pro) if
          scans should attribute signups or orders; the method is the same as{" "}
          <Link
            href="/blogs/lead-conversion-tracking"
            className="text-foreground font-medium underline underline-offset-4"
          >
            link conversion tracking
          </Link>
          .
        </li>
        <li>
          Open the{" "}
          <Link
            href="/tools/qr-code-generator"
            className="text-foreground font-medium underline underline-offset-4"
          >
            QR code generator
          </Link>{" "}
          (no login needed), paste the short link, and pick dot style and
          colors. Keep contrast high — dark dots on a light background scan
          best.
        </li>
        <li>
          Download PNG at up to 2048px for print or SVG for infinite scaling on
          signage. Keep the quiet-zone margin and always test-scan with two
          different phones before printing.
        </li>
        <li>
          Deploy and watch{" "}
          <strong className="text-foreground">Analytics</strong> — filter by
          slug to compare placements. On Growth, add sale attribution (see{" "}
          <Link
            href="/blogs/track-revenue-with-short-links"
            className="text-foreground font-medium underline underline-offset-4"
          >
            revenue tracking
          </Link>
          ) to see which poster actually sold.
        </li>
      </Ol>

      <H2 id="use-cases">Where tracked QR codes pay off</H2>
      <Ul>
        <li>
          <strong className="text-foreground">Packaging and menus</strong> — one
          code per product line shows what gets reordered, not just scanned.
        </li>
        <li>
          <strong className="text-foreground">Posters and events</strong> — one
          code per venue or booth ranks placements by conversions.
        </li>
        <li>
          <strong className="text-foreground">Receipts and invoices</strong> —
          review-request codes attribute repeat business to the original visit.
        </li>
        <li>
          <strong className="text-foreground">Wi-Fi and contact codes</strong> —
          handy, but note these encode credentials directly, not a URL, so they
          cannot carry link analytics. Use URL codes when measurement matters.
        </li>
      </Ul>

      <H2 id="print-tips">Print tips that protect scan rates</H2>
      <Ul>
        <li>
          Minimum ~2×2 cm for close-range scans; scale up with viewing distance
          (posters need far larger codes).
        </li>
        <li>
          Use high error correction when placing codes on textured or curved
          surfaces.
        </li>
        <li>
          Never invert colors (light dots on dark backgrounds fail on many
          readers) and avoid yellow-on-white.
        </li>
        <li>
          Short URLs make denser, easier-to-scan codes — another reason to{" "}
          <InlineCode>shorten first</InlineCode>.
        </li>
      </Ul>

      <H2 id="get-started">Get started</H2>
      <P>
        Shorten your destination, generate the QR from the short link, and your
        next print run reports scans like any other campaign.
      </P>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/tools/qr-code-generator"
          className="bg-foreground text-background inline-flex h-10 items-center rounded-md px-4 text-sm font-medium"
        >
          Generate a tracked QR
        </Link>
        <Link
          href="https://app.slugy.co/signup"
          className="border-border text-foreground inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
        >
          Get free short links
        </Link>
      </div>
    </article>
  );
}

export const QrCodeAnalyticsFaqs = [
  {
    q: "How do I track QR code scans?",
    a: "Create a Slugy short link first, then generate the QR code from that short URL. Every scan registers as a click with device, country, and referrer data in your link analytics.",
  },
  {
    q: "Is the QR code generator really free?",
    a: "Yes — no account, no watermark, unlimited generation, rendered locally in your browser. Link analytics for scans need a free Slugy workspace.",
  },
  {
    q: "Can tracked QR codes attribute sales?",
    a: "Yes. Turn on lead tracking (Pro) or add sale attribution (Growth) on the underlying short link, and scans attribute signups and revenue like any other click.",
  },
  {
    q: "Why use one QR code per placement?",
    a: "Separate codes for packaging, posters, and events report scans per placement instead of one blended number, so you can compare which placement actually converted.",
  },
];
