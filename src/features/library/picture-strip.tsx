import type { CategoryWithCount } from "@/server/repositories/catalog-repository";

import { AllCategoriesTile, CategoryTile } from "./category-tile";

/**
 * The listing picture strip (hi-fi 6a): nine equal items — the first
 * eight populated categories (launch order) plus a dashed "All
 * categories" tile. It replaces a category dropdown so a non-reader can
 * re-navigate here too. All nine fit at 1280; below that the strip
 * scrolls sideways rather than disappearing. The current category is
 * always one of the eight, swapped in for the last slot if it ranks
 * lower.
 */
export function PictureStrip({
  categories,
  selectedSlug,
}: {
  categories: CategoryWithCount[];
  selectedSlug?: string;
}) {
  const strip = categories.slice(0, 8);
  if (selectedSlug && !strip.some((c) => c.slug === selectedSlug)) {
    const selected = categories.find((c) => c.slug === selectedSlug);
    if (selected) strip[strip.length - 1] = selected;
  }

  return (
    <nav
      aria-label="Categories"
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <div className="mt-[18px] flex gap-3">
        {strip.map((category) => (
          <CategoryTile
            key={category.slug}
            category={category}
            variant="strip"
            selected={category.slug === selectedSlug}
            className="w-28 flex-none md:w-auto md:flex-1"
          />
        ))}
        <AllCategoriesTile className="w-28 flex-none md:w-auto md:flex-1" />
      </div>
    </nav>
  );
}
