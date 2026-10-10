import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Reveal } from "./reveal";

// Set when the listing goes live; otherwise falls back to store search
// so the section still works before approval.
const CHROME_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_STORE_URL?.trim() ||
  "https://chromewebstore.google.com/search/slugy";

export default function ExtensionSection() {
  return (
    <section
      id="browser-extension"
      aria-labelledby="browser-extension-heading"
      className="mx-auto max-w-6xl scroll-mt-20 px-2 py-10 sm:px-4 sm:py-12"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Chrome extension
        </p>
        <h2
          id="browser-extension-heading"
          className="mt-2 text-2xl font-medium text-balance sm:text-4xl"
        >
          Shorten from anywhere
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Shorten the tab you&apos;re on with Ctrl+Shift+L — no dashboard
          needed.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground inline-flex h-11 items-center gap-2 rounded-md px-6 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Image
              src="/icons/chrome.svg"
              width={16}
              height={16}
              alt=""
              aria-hidden="true"
              className="h-4 w-4"
            />
            Add to Chrome
            {/* <ExternalLink className="h-3.5 w-3.5" aria-hidden /> */}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
