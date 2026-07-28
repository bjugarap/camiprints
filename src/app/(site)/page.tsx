import Link from "next/link";

import { HomeCategoryPicker } from "@/features/library/home-category-picker";
import { PageCard } from "@/features/library/page-card";
import { getCatalogRepository } from "@/server/repositories";
import { Artwork } from "@/shared/artwork";
import { Button } from "@/shared/button";
import type { ColoringPage } from "@/types/catalog";

/**
 * Home — child-first. Many visitors are pre-readers: the page is a compact
 * greeting, then every category as a large picture grid, then rows of real
 * pages — a child scrolls until they recognise something and taps it.
 * Parent-facing material (the photo converter, the reassurance row) sits
 * below the pictures. Calm Mode removes the hero, promo band and
 * reassurance row (CSS-driven via the calm: variant); the picture grid and
 * card rows remain.
 */
function CardRow({
  id,
  heading,
  hint,
  pages,
}: {
  id: string;
  heading: string;
  hint?: string;
  pages: ColoringPage[];
}) {
  return (
    <section aria-labelledby={id} className="px-4 pt-[34px] md:px-10">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h2 id={id} className="text-subsection md:text-section text-ink">
          {heading}
        </h2>
        {hint ? <p className="text-base text-ink-40 calm:hidden">{hint}</p> : null}
      </div>
      <div className="mt-[18px] grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {pages.map((page) => (
          <PageCard key={`${page.categorySlug}/${page.slug}`} page={page} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const repo = getCatalogRepository();
  const [categories, easyPicks, newThisWeek] = await Promise.all([
    repo.listCategories(),
    repo.getEasyPicks(5),
    repo.getNewThisWeek(5),
  ]);
  return (
    <div className="mx-auto max-w-[1280px]">
      {/* Compact hero — a greeting, not a pitch. The pictures below are the
          call to action. Removed entirely in Calm Mode. */}
      <section className="px-4 pb-3 pt-7 md:px-10 calm:hidden">
        <h1 className="text-hero max-w-[22ch] text-[27px]/[1.1] text-ink md:text-[36px]/[1.1]">
          Free coloring pages, made simple.
        </h1>
        <p className="text-body mt-2 max-w-[46ch] text-ink-60">
          Tap a picture you like — printing takes one tap more.
        </p>
      </section>

      <HomeCategoryPicker categories={categories} />

      <CardRow
        id="easy-pages"
        heading="Easy pages for younger children"
        hint="Big shapes, thick lines"
        pages={easyPicks}
      />

      <CardRow id="new-this-week" heading="New this week" pages={newThisWeek} />

      {/* Promo band — removed in Calm Mode. */}
      <section
        aria-labelledby="promo-heading"
        className="mx-4 mt-[34px] flex flex-col items-center gap-6 rounded-promo border border-accent-tint-line bg-accent-tint p-6 md:mx-10 md:flex-row md:gap-[30px] md:px-7 md:py-[26px] calm:hidden"
      >
        <div className="flex items-center gap-3" aria-hidden>
          {(["photo of\na dog", "line art", "printed\nsheet"] as const).map(
            (label, index) => (
              <div key={label} className="flex items-center gap-3">
                {index > 0 ? (
                  <span className="text-xl text-accent">→</span>
                ) : null}
                <Artwork
                  alt=""
                  label={label}
                  placeholder="bg-card"
                  className="size-[92px] rounded-xl border border-accent-tint-line"
                  labelClassName="whitespace-pre-line text-[11px] text-[#8FA79F]"
                />
              </div>
            ),
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <p className="text-eyebrow text-accent-ink">For grown-ups</p>
          <h2 id="promo-heading" className="text-subsection mt-1 text-ink">
            Make one from your own photo
          </h2>
          <p className="mt-1.5 max-w-[52ch] text-[16.5px]/[1.5] text-accent-ink">
            Upload, convert, print — about a minute. Photos stay private,
            never published.
          </p>
        </div>
        <Button asChild size="xl" className="w-full px-[34px] md:w-auto">
          <Link href="/create/photo">Start</Link>
        </Button>
      </section>

      {/* Reassurance row — removed in Calm Mode. */}
      <section
        aria-label="What makes CamiPrints calm"
        className="mx-4 mb-[34px] mt-[26px] grid grid-cols-1 gap-[18px] border-t border-line pt-[22px] md:mx-10 md:grid-cols-3 xl:grid-cols-5 calm:hidden"
      >
        {(
          [
            ["No disruptive ads", "Nothing moves unless you touch it."],
            ["Predictable navigation", "The same four links, always."],
            ["Reduced motion", "Respects your system setting."],
            ["Full keyboard support", "Visible focus on every control."],
            ["Calm Mode", "Fewer things on screen at once."],
          ] as const
        ).map(([claim, detail]) => (
          <div key={claim}>
            <h3 className="text-[15.5px] font-semibold text-ink">{claim}</h3>
            <p className="mt-1 text-sm/[1.45] text-ink-40">{detail}</p>
          </div>
        ))}
      </section>

      {/* Calm Mode still ends the page cleanly above the footer. */}
      <div className="hidden pb-[34px] calm:block" />
    </div>
  );
}
