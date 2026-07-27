import Link from "next/link";

import { Artwork } from "@/shared/artwork";
import { Button } from "@/shared/button";

/**
 * Home — hi-fi 5c. Phase 1 ships the hero; the category grid, card rows,
 * promo band and reassurance row land with the browsing phase.
 */
export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <section className="flex flex-col items-center gap-10 px-4 pb-[34px] pt-10 md:flex-row md:px-10">
        <div className="flex-1">
          <h1 className="text-hero max-w-[16ch] text-[27px]/[1.1] text-ink md:text-[46px]/[1.08]">
            Free coloring pages, made simple.
          </h1>
          <p className="text-body mt-3 max-w-[46ch] text-ink-60">
            Browse, print, download — or turn your own photo into a page. No
            clutter, no ads, nothing that jumps at you.
          </p>
          <div className="mt-[22px] flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <Button asChild size="xl" className="w-full md:w-auto">
              <Link href="/coloring-pages">Browse coloring pages</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="xl"
              className="w-full md:w-auto"
            >
              <Link href="/create/photo">Turn a photo into a page</Link>
            </Button>
          </div>
        </div>
        <Artwork
          alt="A printed coloring sheet photographed on a table"
          label={"hero artwork — one printed sheet,\nphotographed on a table"}
          className="hidden h-[250px] w-[400px] shrink-0 rounded-2xl border border-line md:flex"
          labelClassName="whitespace-pre-line text-xs"
        />
      </section>
    </div>
  );
}
