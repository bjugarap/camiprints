import type { Metadata } from "next";
import Link from "next/link";

import { Artwork } from "@/shared/artwork";
import { Button } from "@/shared/button";

export const metadata: Metadata = {
  title: "Create your own",
  description:
    "Turn a photo into a printable coloring page. Free, private, no account needed.",
  alternates: { canonical: "/create" },
};

/**
 * The creation hub (wireframe 4c): one live tool, honest "later" cards.
 * Coming-soon cards are inert — not clickable, no waitlist, no email
 * capture. They set expectations without making a promise.
 */
const COMING_LATER = [
  {
    title: "AI Coloring Page",
    hint: "Describe a scene and we draw it.",
  },
  {
    title: "Custom Coloring Book",
    hint: "Collect pages into one printable book.",
  },
] as const;

export default function CreateHubPage() {
  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-[34px] pt-6 md:px-9">
      <h1 className="text-page-title text-[30px]/[1.1] text-ink md:text-[38px]/[1.1]">
        Create your own
      </h1>
      <p className="text-body mt-1.5 text-ink-60">
        Make a coloring page that doesn’t exist yet. One tool is ready today.
      </p>

      {/* The live tool. */}
      <section
        aria-labelledby="convert-photo"
        className="mt-5 flex flex-col items-center gap-5 rounded-card border-2 border-line bg-card p-5 shadow-card md:flex-row md:gap-[22px]"
      >
        <div className="flex items-center gap-3" aria-hidden>
          {(["upload", "line art", "printed\nsheet"] as const).map(
            (label, index) => (
              <div key={label} className="flex items-center gap-3">
                {index > 0 ? (
                  <span className="text-xl text-accent">→</span>
                ) : null}
                <Artwork
                  alt=""
                  label={label}
                  placeholder="bg-paper"
                  className="size-[76px] rounded-xl border border-line"
                  labelClassName="whitespace-pre-line text-[11px]"
                />
              </div>
            ),
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 id="convert-photo" className="text-[19px] font-semibold text-ink">
            Convert My Photo
          </h2>
          <p className="mx-auto mt-1 max-w-[52ch] text-[15.5px]/[1.5] text-ink-60 md:mx-0">
            Upload a personal photo and turn it into printable black-and-white
            line art. Free, no account needed.
          </p>
        </div>
        <Button asChild size="xl" className="w-full md:w-auto">
          <Link href="/create/photo">Start with a photo</Link>
        </Button>
      </section>

      <h2 className="mt-7 text-[17px] font-semibold text-ink">Coming later</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-[640px]">
        {COMING_LATER.map(({ title, hint }) => (
          // Inert state reads from the dashed swatch + chip, not opacity —
          // dimming the text would sink it below WCAG AA contrast.
          <div key={title} className="rounded-card border border-line bg-card p-3">
            <Artwork
              alt=""
              label="later"
              placeholder="bg-paper"
              className="h-14 rounded-thumb border border-dashed border-line-strong"
            />
            <h3 className="mt-2 text-[15.5px] font-semibold text-ink">
              {title}
            </h3>
            <p className="mt-0.5 text-sm/[1.45] text-ink-60">{hint}</p>
            <p className="mt-2 inline-block rounded-full bg-paper px-2.5 py-1 text-[12.5px] font-medium text-ink-40">
              Not available yet
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
