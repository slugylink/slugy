import type { Metadata } from "next";
import QrGeneratorClient from "./qr-generator-client";

export const metadata: Metadata = {
  title: "Free QR Code Generator — Custom Colors, PNG & SVG Download",
  description:
    "Free QR code generator with no login. Create QR codes for URLs, text, Wi-Fi or email, customize colors and shapes, and download print-ready PNG or SVG.",
  keywords: [
    "qr code generator",
    "free qr code maker",
    "custom qr code",
    "qr code png download",
    "qr code svg",
    "wifi qr code generator",
  ],
  alternates: { canonical: "/tools/qr-code-generator" },
  openGraph: {
    title: "Free QR Code Generator — Custom Colors, PNG & SVG Download",
    description:
      "Create custom QR codes in seconds. No login, no watermark. Download PNG or SVG.",
    url: "/tools/qr-code-generator",
  },
};

const FAQ = [
  {
    q: "Is this QR code generator really free?",
    a: "Yes. No account, no watermark, unlimited generation. The QR image is rendered locally in your browser — nothing is uploaded.",
  },
  {
    q: "Can I download a print-ready QR code?",
    a: "Yes. Export PNG at up to 2048px for print, or SVG for infinite scaling on posters, packaging and signage. Use high error correction and keep quiet-zone margin for reliable scans.",
  },
  {
    q: "What content can I encode?",
    a: "Website URLs, plain text, Wi-Fi credentials (WPA/WEP/open), email addresses with subject/body, phone numbers and SMS. Switch tabs to change the payload format.",
  },
  {
    q: "Do custom colors still scan?",
    a: "Yes, as long as contrast stays high. Dark dots on a light background scan best. Avoid yellow-on-white or inverted colors, and always test-scan before printing.",
  },
  {
    q: "Can I track QR scans with Slugy?",
    a: "Yes. Shorten your destination with Slugy first, then paste the short link here — scans show up in your link analytics. Create a free account to get branded links and scan analytics.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Slugy QR Code Generator",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "/tools/qr-code-generator",
      description:
        "Free QR code generator for URLs, text, Wi-Fi and email with custom colors and PNG/SVG export. No login required.",
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@type": "HowTo",
      name: "How to generate a QR code",
      step: [
        {
          "@type": "HowToStep",
          text: "Enter a URL, text, Wi-Fi or email payload.",
        },
        {
          "@type": "HowToStep",
          text: "Pick dot style, color and export size.",
        },
        { "@type": "HowToStep", text: "Preview live and download PNG or SVG." },
      ],
    },
  ],
};

export default function QrCodeGeneratorPage() {
  return (
    <main className="mt-[65px] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <QrGeneratorClient faqs={FAQ} />
    </main>
  );
}
