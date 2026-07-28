"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/button";
import type { CategoryWithCount } from "@/server/repositories/catalog-repository";

import { CategoryTile } from "./category-tile";

/**
 * "Pick a picture" (hi-fi 5c / 5e). Normal: 2×4 tiles with counts and a
 * "See all N categories" secondary. Calm Mode: four tiles at a time in
 * 2-up with a single 52px "Show more pictures" below — one way forward.
 */
export function HomeCategoryPicker({
  categories,
  totalCategories,
}: {
  categories: CategoryWithCount[];
  totalCategories: number;
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

      <div className="mt-[18px] grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-[18px] xl:grid-cols-4 calm:grid-cols-2">
        {categories.map((category, index) => (
          <CategoryTile
            key={category.slug}
            category={category}
            variant="home"
            className={cn(index >= 4 && !expanded && "calm:hidden")}
          />
        ))}
      </div>

      <div className="mt-5 flex justify-center calm:hidden">
        <Button asChild variant="secondary" size="md">
          <Link href="/categories">See all {totalCategories} categories</Link>
        </Button>
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
