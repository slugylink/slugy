import Link from "next/link";

export default function PricingDetailContent() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pb-10 sm:pb-14">
        <h2 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
          What each plan includes
        </h2>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          Every Slugy plan — including free — includes branded short links,
          custom-domain support, QR codes with every link, bio pages, and a{" "}
          <Link
            href="/tools/utm-builder"
            className="font-medium underline underline-offset-4"
          >
            free UTM builder
          </Link>{" "}
          for GA4-ready campaign URLs. The difference between plans is depth of
          analytics and scale: more links per month, more tracked clicks, longer
          analytics retention, more custom domains, and more team seats. Click
          analytics work everywhere. Lead conversion tracking — attributing
          signups to the link that drove them — unlocks on Pro. Sales analytics
          with revenue per link unlocks on Growth. Premium includes everything
          in Growth with 25 workspaces, 5,000 new links per month, 250,000
          tracked clicks per month, 15 team members, and all-time analytics
          retention.
        </p>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          If you are comparing on price alone, start with{" "}
          <Link
            href="/alternative/bitly"
            className="font-medium underline underline-offset-4"
          >
            Slugy vs Bitly
          </Link>
          : Bitly gates custom domains behind its $29/mo Growth tier and caps
          free at 5 links per month, while Slugy includes a custom domain from
          day one with a free plan that needs no credit card. The comparison
          table on this page shows exact limits for links, clicks, retention,
          domains, and team members — the numbers the pricing cards summarize.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-10 sm:pb-14">
        <h2 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
          Revenue tracking: Pro vs Growth
        </h2>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          Traditional shorteners stop at clicks. Slugy attributes outcomes. On
          Pro, enable conversion tracking on any link, capture the{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 text-[13px]">
            slugy_id
          </code>{" "}
          click id on your site, and record leads with the leads API — see{" "}
          <Link
            href="/blogs/lead-conversion-tracking"
            className="font-medium underline underline-offset-4"
          >
            how to track link conversions
          </Link>
          . On Growth, add saleAmount and saleCurrency to unlock revenue
          reports: which influencer, ad, QR code, or email drove actual dollars.
          E-commerce teams connect this to checkout via{" "}
          <Link
            href="/integrations/shopify"
            className="font-medium underline underline-offset-4"
          >
            the Shopify integration
          </Link>{" "}
          and fan every sale out to{" "}
          <Link
            href="/integrations/zapier"
            className="font-medium underline underline-offset-4"
          >
            Zapier
          </Link>
          , Slack, or Make.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14 sm:pb-20">
        <h2 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
          Custom domains, QR, and teams
        </h2>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          A custom domain URL shortener earns more trust than a generic one —
          yourbrand.co/sale beats a random short code. Connect a domain in
          minutes with guided DNS setup (see{" "}
          <Link
            href="/custom-domain"
            className="font-medium underline underline-offset-4"
          >
            custom domains
          </Link>
          ), then every link, QR code, and bio page inherits it. QR codes cost
          nothing extra and export print-ready; bio pages replace a separate
          link-in-bio tool. Teams get workspaces, roles, and shared UTM
          templates so marketing stays consistent. Cancel anytime in one click
          from billing settings — no calls, no retention flow.
        </p>
      </section>
    </>
  );
}
