import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using Slugy — acceptable use, plans and billing, rate limits, availability, and liability.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Slugy",
    description:
      "The terms for using Slugy — acceptable use, plans and billing, rate limits, availability, and liability.",
    url: "/terms",
    images: [
      {
        url: "https://files.slugy.co/slugy-og.png",
        width: 1200,
        height: 630,
        alt: "Slugy terms of service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | Slugy",
    description:
      "The terms for using Slugy — acceptable use, plans and billing, rate limits, availability, and liability.",
    images: ["https://files.slugy.co/slugy-og.png"],
  },
};

const LAST_UPDATED = "October 2, 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto mt-[120px] min-h-[50vh] w-full max-w-3xl px-4 pb-20">
      <header className="mb-10 border-b pb-8">
        <h1 className="text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Terms of Service
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Last updated: {LAST_UPDATED}
        </p>
      </header>

      <div className="space-y-8 text-sm leading-7 sm:text-base">
        <section>
          <h2 className="text-xl font-medium">1. The service</h2>
          <p className="text-muted-foreground mt-3">
            Slugy provides link shortening, redirect resolution, QR codes,
            link-in-bio pages, custom domains, and click analytics. By creating
            an account or using the service, you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">2. Accounts</h2>
          <p className="text-muted-foreground mt-3">
            You are responsible for the activity under your account, for keeping
            your credentials secure, and for the content of the links you
            create. You must provide accurate registration information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">3. Acceptable use</h2>
          <p className="text-muted-foreground mt-3">
            You must not use Slugy to create or distribute links that:
          </p>
          <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-5">
            <li>distribute malware, phishing, or deceptive redirects;</li>
            <li>infringe intellectual property or violate applicable law;</li>
            <li>send spam or unsolicited bulk messages;</li>
            <li>impersonate another person or brand;</li>
            <li>attempt to overload, scrape, or bypass rate limits.</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            Destinations may be scanned for safety, and we may disable links or
            accounts that violate these terms. The service applies rate limits
            to protect availability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">4. Plans and billing</h2>
          <p className="text-muted-foreground mt-3">
            Paid plans are billed through our payment processor on a monthly or
            yearly basis. Plan limits (links, clicks, custom domains, team
            members, analytics retention) are listed on the{" "}
            <Link href="/pricing" className="underline underline-offset-4">
              pricing page
            </Link>{" "}
            and may change with notice. You can cancel at any time from billing
            settings; access continues to the end of the paid period. Fees are
            non-refundable except where required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">5. Your content</h2>
          <p className="text-muted-foreground mt-3">
            You retain ownership of the links, domains, and content you add. You
            grant us the rights needed to operate the service — for example, to
            store destinations, resolve redirects, and produce analytics for
            your workspace.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">6. Availability</h2>
          <p className="text-muted-foreground mt-3">
            We work to keep the service available but do not guarantee
            uninterrupted operation. We may modify, suspend, or discontinue
            features. Open-source components are provided under their respective
            licenses.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">7. Disclaimer and liability</h2>
          <p className="text-muted-foreground mt-3">
            The service is provided &ldquo;as is&rdquo; without warranties of
            any kind. To the maximum extent permitted by law, we are not liable
            for indirect, incidental, or consequential damages, or for lost
            profits, data, or revenue arising from your use of the service. Our
            total liability is limited to the amount you paid in the twelve
            months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium">8. Changes to these terms</h2>
          <p className="text-muted-foreground mt-3">
            We may update these terms and will revise the date above. Continued
            use after an update constitutes acceptance.
          </p>
          <p className="text-muted-foreground mt-3">
            See also our{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
