import type { Metadata } from "next";
import Link from "next/link";

import { FilterPills } from "@/features/library/filter-bar";
import { CategoryTile } from "@/features/library/category-tile";
import { ListingPagination } from "@/features/library/listing-pagination";
import { PageCard } from "@/features/library/page-card";
import {
  RecentSearches,
  RecordSearch,
} from "@/features/library/recent-searches";
import { suggestQuery } from "@/lib/suggest";
import { parseFilters, type SearchParamsRecord } from "@/lib/url-state";
import { getCatalogRepository } from "@/server/repositories";
import { Artwork } from "@/shared/artwork";
import { Button } from "@/shared/button";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every free coloring page on CamiPrints.",
  alternates: { canonical: "/search" },
  robots: { index: false },
};

const POPULAR_SEARCHES = [
  "dragons",
  "puppies",
  "dinosaurs",
  "ocean animals",
  "trucks",
  "easy coloring pages",
];

function SearchField({ query }: { query: string }) {
  return (
    <form action="/search" role="search" className="mt-4">
      <div className="flex h-12 items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-card py-1 pl-4 pr-1 focus-within:border-accent">
        <span aria-hidden className="text-[15px] text-ink-40">
          ⌕
        </span>
        <input
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Search coloring pages"
          placeholder="What would you like to colour?"
          className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-40"
        />
        {query ? (
          <Link
            href="/search"
            className="flex h-full items-center px-2 text-[15px] font-semibold text-ink-60 underline underline-offset-[3px]"
          >
            Clear
          </Link>
        ) : null}
        <Button type="submit" size="sm" className="h-10">
          Search
        </Button>
      </div>
    </form>
  );
}

function ChipLink({ term }: { term: string }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(term)}`}
      className="flex h-9 items-center rounded-full border border-line bg-card px-[13px] text-sm font-medium text-ink hover:border-line-strong"
    >
      {term}
    </Link>
  );
}

/**
 * /search (wireframe 4b): empty, results and no-results states.
 * Suggestions are static chips, not a live dropdown — nothing moves under
 * the cursor while typing. The query stays in the field and in the URL.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const filters = parseFilters(await searchParams);
  const query = filters.q ?? "";
  const repo = getCatalogRepository();
  const categories = await repo.listCategories();
  const featured = categories.filter((c) => c.featured);

  // Empty state — before searching.
  if (!query) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-[34px] pt-10 md:px-0">
        <h1 className="text-page-title text-center text-[30px]/[1.1] text-ink">
          Search coloring pages
        </h1>
        <SearchField query="" />
        <RecentSearches />
        <section aria-label="Popular searches" className="mt-6">
          <h2 className="text-sm font-medium text-ink-60">Popular searches</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <ChipLink key={term} term={term} />
            ))}
          </div>
        </section>
        <section aria-label="Browse by picture" className="mt-6">
          <h2 className="text-sm font-medium text-ink-60">
            Or browse by picture
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {featured.slice(0, 4).map((category) => (
              <CategoryTile
                key={category.slug}
                category={category}
                variant="strip"
              />
            ))}
          </div>
        </section>
      </div>
    );
  }

  const results = await repo.listPages(filters);

  // No results — offer the spelling correction as a button.
  if (results.total === 0) {
    const vocabulary = new Set<string>([
      ...categories.map((c) => c.name),
      ...POPULAR_SEARCHES,
      ...(await repo.listPages({ perPage: 1000 })).pages.flatMap((p) =>
        p.title.split(/\s+/),
      ),
    ]);
    const suggestion = suggestQuery(query, vocabulary);

    return (
      <div className="mx-auto max-w-2xl px-4 pb-[34px] pt-10 md:px-0">
        <h1 className="sr-only">Search coloring pages</h1>
        <SearchField query={query} />
        <div className="mt-8 text-center" role="status">
          <h2 className="font-display text-2xl/[1.15] font-bold text-ink">
            No pages found for “{query}”
          </h2>
          {suggestion ? (
            <>
              <p className="mt-1.5 text-base/[1.6] text-ink-60">
                Did you mean <b className="underline">{suggestion}</b>?
              </p>
              <div className="mt-3 flex justify-center">
                <Button asChild size="md">
                  <Link href={`/search?q=${encodeURIComponent(suggestion)}`}>
                    Search for “{suggestion}”
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </div>
        <section aria-label="Try one of these" className="mt-8">
          <h2 className="text-sm font-medium text-ink-60">
            Or try one of these
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR_SEARCHES.slice(0, 4).map((term) => (
              <ChipLink key={term} term={term} />
            ))}
          </div>
        </section>
        <Link
          href="/create/photo"
          className="mt-6 flex items-center gap-3 rounded-card border border-line bg-card p-3.5 shadow-card hover:border-line-strong"
        >
          <Artwork
            alt=""
            label="photo"
            placeholder="bg-accent-tint"
            className="size-11 flex-none rounded-lg"
            labelClassName="text-[10px]"
          />
          <span className="text-[14.5px]/[1.45]">
            <b className="text-ink">Can’t find it? Make it.</b>
            <br />
            <span className="text-ink-40">
              Turn one of your own photos into a coloring page.
            </span>
          </span>
        </Link>
      </div>
    );
  }

  // Results.
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-[34px] pt-8 md:px-10">
      <RecordSearch query={query} />
      <h1 className="sr-only">Search coloring pages</h1>
      <div className="mx-auto max-w-2xl">
        <SearchField query={query} />
      </div>
      <p aria-live="polite" className="mt-4 text-[16.5px] text-ink-60">
        <b className="font-bold text-ink">
          {results.total} {results.total === 1 ? "result" : "results"}
        </b>{" "}
        for “{query}”
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <FilterPills filters={filters} />
      </div>
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
      <ListingPagination
        results={results}
        filters={filters}
        pathname="/search"
      />
    </div>
  );
}
