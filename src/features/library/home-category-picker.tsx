"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/button";
import type { CategoryWithCount } from "@/server/repositories/catalog-repository";

import { CategoryTile } from "./category-tile";

/**
 * "Pick a picture" — the heart of the child-first home. Every category is
 * on the page in a 5-up image grid (3-up tablet, 2-up mobile): a pre-reader
 * scrolls until a picture they recognise appears, no "See all" detour.
 * Calm Mode: four tiles at a time in 2-up with a single 52px "Show more
 * pictures" below — one way forward.
 */
export function HomeCategoryPicker({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section aria-labelledby="pick-a-picture" className="px-4 pt-2 md:px-10">
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h2 id="pick-a-picture" className="text-subsection md:text-section text-ink">
          Pick a picture
        </h2>
        <p className="text-base text-ink-40 calm:hidden">
          Tap any picture to see those pages
        </p>
      </div>

      <div className="mt-[18px] grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-[18px] xl:grid-cols-5 calm:grid-cols-2">
        {categories.map((category, index) => (
          <CategoryTile
            key={category.slug}
            category={category}
            variant="home"
            className={cn(index >= 4 && !expanded && "calm:hidden")}
          />
        ))}
      </div>

      {!expanded ? (
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setExpanded(true)}
          className="mt-4 hidden w-full calm:inline-flex"
        >
          Show more pictures
        </Button>
      ) : null}
    </section>
  );
}
