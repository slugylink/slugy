import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Slugy collects, uses, and protects data — accounts, links, click analytics, cookies, and third-party processors.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Slugy",
    description:
      "How Slugy collects, uses, and protects data — accounts, links, click analytics, cookies, and processors.",
    url: "/privacy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Slugy",
    description:
      "How Slugy collects, uses, and protects data — accounts, links, click analytics, cookies, and processors.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const LAST_UPDATED = "October 2, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto mt-[120px] min-h-[50vh] w-full max-w-3xl px-4 pb-20">
      <header className="mb-10 border-b pb-8">
        <h1 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Last updated: {LAST_UPDATED}
        </p>
      </header>

      <div className="space-y-8 text-sm leading-7 sm:text-base">
        <section>
          <h2 className="text-xl font-medium">Data we collect</h2>
          <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Account data</strong> — name, email address, profile
              image, and authentication identifiers from the sign-in provider
              you use.
            </li>
            <li>
              <strong>Workspace and link data</strong> — workspaces you create,
              links, destination URLs, slugs, custom domains, tags, and
              link-in-bio content.
            </li>
            <li>
              <strong>Click analytics</strong> — for each click on a tracked
              link: timestamp, approximate location derived from IP (country,
              city, continent), device, browser, operating system, referrer, UTM
              parameters, and a generated click identifier. We do not store full
              user-agent strings in the analytics dashboard beyond what is
              needed for these breakdowns.
            </li>
            <li>
              <strong>Billing data</strong> — subscription and payment status.
              Card details are handled by our payment processor; we do not store
              them.
            </li>
            <li>
              <strong>Diagnostic data</strong> — error reports and performance
              metrics used to keep the service reliable.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium">How we use it</h2>
          <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5">
            <li>
              Provide the service: shorten links, resolve redirects, count
              clicks.
            </li>
            <li>Show you analytics for links you own and reports you share.</li>
            <li>
              Enforce plan limits, prevent abuse, and block malicious
              destinations.
            </li>
            <li>
              Send transactional email such as verification and invitations.
            </li>
            <li>Diagnose errors and improve performance.</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            We do not sell personal data. We do not use click analytics to build
            advertising profiles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">Cookies and local storage</h2>
          <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Session cookies</strong> — keep you signed in
              (authentication).
            </li>
            <li>
              <strong>Password-verification cookies</strong> — remember that you
              unlocked a password-protected link.
            </li>
            <li>
              <strong>Attribution cookie</strong> — stores a click identifier so
              lead and sales attribution works across the landing page and the
              app. It is first-party and only set when you click a link with
              conversion tracking enabled.
            </li>
            <li>
              <strong>Preferences</strong> — layout and theme choices stored
              locally in your browser.
            </li>
          </ul>
          <p className="text-muted-foreground mt-3">
            You can clear cookies in your browser at any time; doing so signs
            you out and resets remembered link unlocks.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">Retention</h2>
          <p className="text-muted-foreground mt-3">
            Link and click data is retained for the analytics retention window
            of your plan. Deleting your account removes your account and
            associated workspaces and links, subject to short-lived backups and
            records we must keep for billing or legal reasons.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">Service providers</h2>
          <p className="text-muted-foreground mt-3">
            We share data with processors that operate the service, limited to
            what each needs:
          </p>
          <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5">
            <li>Cloud hosting and edge delivery</li>
            <li>Managed PostgreSQL database and read replica</li>
            <li>Redis-compatible cache and scheduled jobs</li>
            <li>Analytics event store for click reporting</li>
            <li>Object storage for uploaded images</li>
            <li>Payment and subscription management</li>
            <li>Transactional email delivery</li>
            <li>Error monitoring and performance telemetry</li>
            <li>Optional AI slug suggestions for links you create</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium">Your choices</h2>
          <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5">
            <li>Export your links as CSV from the dashboard at any time.</li>
            <li>Delete links, workspaces, or your account from settings.</li>
            <li>
              Request a copy of your personal data or its deletion by opening a
              discussion on{" "}
              <a
                href="https://github.com/slugylink/slugy/discussions/categories/feedback"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                GitHub
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium">Changes</h2>
          <p className="text-muted-foreground mt-3">
            We will update this page when our practices change and revise the
            date above.
          </p>
          <p className="text-muted-foreground mt-3">
            See also our{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
