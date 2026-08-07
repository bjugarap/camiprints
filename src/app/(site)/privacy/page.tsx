import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What CamiPrints collects, what it never collects, and exactly what the Chrome extension sends. No accounts, no ads, no tracking.",
  alternates: { canonical: "/privacy" },
};

/**
 * The privacy policy for both camiprints.com and the Chrome extension.
 * The extension section carries its own `id` so the Chrome Web Store
 * listing can link straight to it (`/privacy#chrome-extension`).
 *
 * Every claim here is the plain-language version of
 * docs/privacy-and-retention.md — when the architecture changes, that
 * document and this page move together.
 */
const LAST_UPDATED = "August 6, 2026";

/** Section heading + prose column, so every section is spaced the same. */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mt-8 scroll-mt-6">
      <h2
        id={`${id}-heading`}
        className="text-subsection text-[23px]/[1.15] text-ink md:text-[26px]/[1.15]"
      >
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-[16.5px]/[1.6] text-ink-60">
        {children}
      </div>
    </section>
  );
}

/** Bulleted list at the same measure and rhythm as the body prose. */
function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const EXTENSION_NEVER = [
  "Apart from that one explicit action, no data is sent to any server.",
  "No searches, image links, or browsing history are collected or stored.",
  "No analytics, no advertising, no tracking of any kind.",
  "No remote code — every file the extension runs ships inside the extension itself.",
  "Image links are not written to the browser console unless a developer manually turns on the DEBUG flag in content.js.",
] as const;

const WEBSITE_NEVER = [
  "No accounts, no sign-in, no email collection.",
  "No advertising, no ad networks, no cross-site tracking, no third-party trackers.",
  "Nothing you make is published, shared, or added to the public library.",
  "Your photos are never used for advertising or to train models.",
] as const;

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-[42px] pt-6 md:px-9">
      <h1 className="text-page-title text-[30px]/[1.1] text-ink md:text-[38px]/[1.1]">
        Privacy
      </h1>
      <p className="mt-1.5 text-[17px]/[1.55] text-ink-60">
        CamiPrints is a small family site for printing coloring pages. It has
        no accounts, no ads, and nothing that follows you around. This page
        covers both the website and the Chrome extension.
      </p>
      <p className="text-meta mt-2 text-ink-40">Last updated {LAST_UPDATED}</p>

      {/* The one promise everything else on this page is a footnote to. */}
      <p className="mt-5 rounded-card border-2 border-accent-tint-line bg-accent-tint p-4 text-[16.5px]/[1.55] text-ink">
        We don’t want your data. The only thing we ever receive is an image
        you deliberately hand us, and we delete it as soon as your browser has
        it back.
      </p>

      <Section id="website" title="The website">
        <p>
          Browsing, viewing and printing coloring pages needs nothing from you.
          There is no sign-up, and no cookie banner because there are no
          tracking cookies to ask about.
        </p>
        <p>
          <strong className="font-semibold text-ink">
            Turning your photo into a coloring page.
          </strong>{" "}
          The Quick Outline tool runs entirely in your browser — the photo is
          never transmitted to us. The AI tool does send the cropped photo to
          our server, which passes it straight to the drawing service and
          hands the result back. We keep no copy of it, and nothing about the
          image is logged. The finished page is stored only in your own
          browser, and “Start Over” clears it.
        </p>
        <p>
          <strong className="font-semibold text-ink">
            Traffic measurement.
          </strong>{" "}
          We count page views with Vercel Web Analytics, which is cookieless
          and anonymized: the page, the referrer, a country and a device type.
          No cookies, no identifiers, nothing that can be tied back to a
          person or followed across sites.
        </p>
        <List items={WEBSITE_NEVER} />
      </Section>

      <Section id="chrome-extension" title="The Chrome extension">
        <p>
          Printing happens entirely on your computer. The only thing that ever
          leaves it is the picture you explicitly send to CamiPrints by
          clicking{" "}
          <strong className="font-semibold text-ink">Make Coloring Page</strong>{" "}
          — and even then only the image bytes are uploaded: never the page
          URL, the search words, or any image link. (The site never fetches
          remote URLs.)
        </p>
        <List items={EXTENSION_NEVER} />
        <p>
          The only thing the extension saves is your settings, in Chrome’s
          extension storage — synced with your Google profile if you have
          Chrome sync turned on — and a temporary “print job” record that is
          deleted as soon as the print page reads it.
        </p>
        <p>
          When you do click Make Coloring Page, the image is held on our
          server just long enough to reach the tab that opens: it is deleted
          the moment that page reads it, and in any case within 10 minutes. It
          is keyed by a single-use random token that carries no information
          about you, and no public link to it ever exists.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          This site is meant to be safe for children to use. It asks for no
          personal information from anyone, of any age, and there is nothing
          here to sign up for. Because we collect no personal information, we
          have none to share, sell, or hand to advertisers — and there is
          nothing for a parent to request the deletion of.
        </p>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <p>
          If what we collect ever changes, this page changes with it and the
          date above is updated. Any feature that would store something about
          you — saved creations, for example — will be opt-in, and will say so
          before you use it.
        </p>
      </Section>
    </div>
  );
}
