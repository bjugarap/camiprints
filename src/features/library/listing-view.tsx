import Link from "next/link";

import { getCatalogRepository } from "@/server/repositories";
import { filtersHref } from "@/lib/url-state";
import { Button } from "@/shared/button";
import type { PageFilters } from "@/types/catalog";

import { CategoryTile } from "./category-tile";
import { FilterBar } from "./filter-bar";
import { ListingPagination } from "./listing-pagination";
import { PageCard } from "./page-card";
import { PictureStrip } from "./picture-strip";
import { ResultSummary } from "./result-summary";

/**
 * The shared listing surface for /coloring-pages and
 * /coloring-pages/[category] (hi-fi 6a): breadcrumb, 38px title, picture
 * strip, filter bar, result summary, 4-up grid with View + Print, and
 * pagination. Edge states from the wireframes: no results (offer Clear
 * filters — the picture strip stays), single result, end of list.
 */
export async function ListingView({
  filters,
  categorySlug,
}: {
  filters: PageFilters;
  categorySlug?: string;
}) {
  const repo = getCatalogRepository();
  const [categories, category, subcategories] = await Promise.all([
    repo.listCategories(),
    categorySlug ? repo.getCategory(categorySlug) : Promise.resolve(null),
    categorySlug ? repo.listSubcategories(categorySlug) : Promise.resolve([]),
  ]);
  // A subcategory (e.g. lion) breadcrumbs through its parent (animals).
  const parent = category?.parentSlug
    ? await repo.getCategory(category.parentSlug)
    : null;

  const pathname = categorySlug
    ? `/coloring-pages/${categorySlug}`
    : "/coloring-pages";
  const results = await repo.listPages({
    ...filters,
    category: categorySlug,
  });

  const title = category?.name ?? "Coloring pages";

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-10">
      <nav aria-label="Breadcrumb" className="text-[14.5px] font-medium text-ink-40">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-accent">
              Home
            </Link>
          </li>
          <li aria-hidden>›</li>
          {category ? (
            <>
              <li>
                <Link href="/coloring-pages" className="hover:text-accent">
                  Coloring pages
                </Link>
              </li>
              <li aria-hidden>›</li>
              {parent ? (
                <>
                  <li>
                    <Link
                      href={`/coloring-pages/${parent.slug}`}
                      className="hover:text-accent"
                    >
                      {parent.name}
                    </Link>
                  </li>
                  <li aria-hidden>›</li>
                </>
              ) : null}
              <li aria-current="page" className="text-ink">
                {category.name}
              </li>
            </>
          ) : (
            <li aria-current="page">Coloring pages</li>
          )}
        </ol>
      </nav>

      <h1 className="text-page-title mt-1.5 text-[30px]/[1.1] text-ink md:text-[38px]/[1.1]">
        {title}
      </h1>

      <PictureStrip categories={categories} selectedSlug={categorySlug} />

      {subcategories.length > 0 ? (
        <section
          aria-labelledby="subcategory-picker"
          className="mt-[22px] rounded-card border border-line bg-card p-4"
        >
          <h2 id="subcategory-picker" className="text-subsection text-ink">
            {categorySlug === "animals" ? "Pick an animal" : "Pick a collection"}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-[18px]">
            {subcategories.map((subcategory) => (
              <CategoryTile key={subcategory.slug} category={subcategory} />
            ))}
          </div>
        </section>
      ) : null}

      <FilterBar
        filters={filters}
        searchPlaceholder={
          category
            ? `Search within ${category.name.toLowerCase()}`
            : "Search all pages"
        }
      />

      <ResultSummary
        filters={filters}
        total={results.total}
        pathname={pathname}
        categoryChip={
          category
            ? {
                label: category.name,
                removeHref: filtersHref("/coloring-pages", {
                  ...filters,
                  page: 1,
                }),
              }
            : undefined
        }
      />

      {results.total === 0 ? (
        <div className="mb-[34px] mt-6 rounded-card border-[1.5px] border-dashed border-line-strong bg-card p-8 text-center">
          <h2 className="font-display text-2xl/[1.15] font-bold text-ink">
            No pages match those filters
          </h2>
          <p className="mx-auto mt-1.5 max-w-[44ch] text-base/[1.5] text-ink-60">
            Nothing was lost — loosen a filter, or pick a picture above to
            start somewhere friendly.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild variant="secondary" size="md">
              <Link href={filtersHref(pathname, {})}>Clear filters</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-[22px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            {results.pages.map((page) => (
              <PageCard
                key={`${page.categorySlug}/${page.slug}`}
                page={page}
                actions="view-print"
                thumbHeight={190}
              />
            ))}
          </div>

          {results.page === results.totalPages && results.totalPages > 1 ? (
            <p className="mt-6 text-center text-[15px] text-ink-40">
              That’s every page that matches.
            </p>
          ) : null}

          <ListingPagination
            results={results}
            filters={filters}
            pathname={pathname}
          />
          {results.totalPages <= 1 ? <div className="pb-[34px]" /> : null}
        </>
      )}
    </div>
  );
}
