import { Callout, Cta, H2, P, Related, Steps, Ul } from "./_compare";

const COMPARISON: Array<[aspect: string, slugy: string, native: string]> = [
  [
    "Click counts",
    "Per story, per slug — in your dashboard",
    "Only total sticker taps in Insights",
  ],
  [
    "Edit after posting",
    "Retarget the slug anytime; the sticker keeps working",
    "Sticker URL is frozen once posted",
  ],
  ["Branding", "Your domain on every tap", "Raw URL or generic shortener"],
  [
    "Reuse",
    "Same slug on QR, email, and bio",
    "New URL per placement, no shared stats",
  ],
  [
    "Conversions",
    "Lead and revenue attribution on Pro/Growth",
    "No signup or sales data",
  ],
];

export default function InstagramStoryLinksPost() {
  return (
    <article className="prose-slugy">
      <P>
        Adding a link to an Instagram Story takes ten seconds: open the stickers
        tray, drop a Link sticker, paste a URL. The part most creators skip is
        what that URL should be. A raw link gives you zero data back — a branded
        Slugy short link counts every tap per story, stays editable after
        posting, and can attribute signups when you are ready for that.
      </P>

      <H2 id="add-link-sticker">How to add a link sticker to a Story</H2>
      <Steps
        items={[
          <>
            <strong className="text-foreground">Create the Story.</strong>{" "}
            Photo, video, or Boomerang — add your visuals and text first so the
            sticker lands in a clean spot.
          </>,
          <>
            <strong className="text-foreground">
              Open stickers and pick Link.
            </strong>{" "}
            Tap the sticker icon at the top, then the Link sticker (chain-link
            icon). Link stickers work on all account types — the old 10k
            follower requirement is gone.
          </>,
          <>
            <strong className="text-foreground">Paste your short link.</strong>{" "}
            Paste a branded Slugy link (e.g. yourbrand.co/drop) rather than a
            raw URL. Tap Customize Sticker Text and write what the tap does —
            “Shop the drop”, “Read the guide” — then place and scale the
            sticker.
          </>,
          <>
            <strong className="text-foreground">Post and verify.</strong>{" "}
            Publish, tap through the sticker yourself once, and confirm the
            click lands in your Slugy analytics for that slug.
          </>,
        ]}
      />

      <H2 id="branded-link">Why a branded short link beats a raw URL</H2>
      <P>
        Create one short link per story — yourbrand.co/oct-drop instead of one
        recycled link. Per-story slugs turn Story analytics from a blended total
        into per-story click counts, so you learn which creative actually
        pulled.
      </P>
      <div className="border-border mt-6 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="bg-muted/40 text-foreground">
              <th className="w-36 px-3 py-2.5 font-medium">Capability</th>
              <th className="px-3 py-2.5 font-medium">Slugy-tracked link</th>
              <th className="px-3 py-2.5 font-medium">Native sticker link</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {COMPARISON.map(([aspect, slugy, native], i) => (
              <tr
                key={aspect}
                className={i > 0 ? "border-border border-t" : undefined}
              >
                <td className="text-foreground w-36 px-3 py-2 font-medium">
                  {aspect}
                </td>
                <td className="px-3 py-2">{slugy}</td>
                <td className="px-3 py-2">{native}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout>
        <strong>What Slugy cannot see:</strong> story views, impressions, and
        who tapped. Instagram keeps viewer-level data to itself — link tools
        count taps on the short link, nothing more. Anyone promising per-viewer
        Story attribution from a link is selling something impossible.
      </Callout>

      <H2 id="best-practices">Best practices that actually move clicks</H2>
      <Ul>
        <li>
          <strong className="text-foreground">One link per story.</strong>{" "}
          Stickers share attention badly. A single sticker with a matching
          call-to-action (“Tap to shop”) beats three competing links.
        </li>
        <li>
          <strong className="text-foreground">
            Match sticker text to the creative.
          </strong>{" "}
          The sticker is a button, not a caption — label the outcome, keep it
          under four words, and place it where thumbs rest.
        </li>
        <li>
          <strong className="text-foreground">
            Give links a permanent home.
          </strong>{" "}
          Stories vanish in 24 hours; a{" "}
          <strong className="text-foreground">bio page</strong> does not. Put
          your bio page URL in your profile and link it from highlight covers,
          so latecomers still convert. Slugy bio pages live on bio.slugy.co or
          your own domain with per-link click stats —{" "}
          <strong className="text-foreground">free to start</strong>.
        </li>
        <li>
          <strong className="text-foreground">
            Name slugs so future-you understands them.
          </strong>{" "}
          yourbrand.co/ig-oct-drop beats yourbrand.co/x7q2 when you review the
          month in analytics.
        </li>
      </Ul>

      <H2 id="track-clicks">Tracking clicks per story</H2>
      <P>
        Open the slug&apos;s analytics: taps over time, referrer (Instagram),
        device split, and country. Comparing two stories is comparing two slugs
        — no UTM gymnastics required, though UTMs still help when the same link
        travels across email and ads too. When taps should become signups or
        sales, the method is{" "}
        <strong className="text-foreground">link conversion tracking</strong>{" "}
        (Pro for leads, Growth for revenue).
      </P>

      <Related
        items={[
          {
            href: "/blogs/qr-code-generator-with-analytics",
            label: "Tracked QR codes",
            note: "the same shorten-first method for print and packaging",
          },
          {
            href: "/blogs/lead-conversion-tracking",
            label: "Link conversion tracking",
            note: "turn story taps into attributed signups",
          },
          {
            href: "/features/bio-links",
            label: "Bio links",
            note: "a permanent home for every link you share",
          },
        ]}
      />
      <Cta />
    </article>
  );
}

export const InstagramStoryLinksFaqs = [
  {
    q: "How do I add a clickable link to an Instagram Story?",
    a: "Create the Story, tap the sticker icon, choose the Link sticker, paste your URL, customize the sticker text, and post. Link stickers are available on all account types.",
  },
  {
    q: "Why use a branded short link instead of a raw URL in Stories?",
    a: "A branded short link counts taps per story, stays editable after posting, carries your domain, and can attribute signups and sales. A raw URL gives you none of that.",
  },
  {
    q: "How do I track exactly how many clicks my Story link gets?",
    a: "Use one short link per story and read its click analytics — taps over time, devices, and countries per slug. Instagram Insights shows total sticker taps; Slugy breaks them down per story.",
  },
  {
    q: "Can link tools see who viewed or tapped my Story?",
    a: "No. Instagram keeps viewer-level data private. Link tools count taps on the short link only — per-viewer Story attribution from a link is not possible.",
  },
];
