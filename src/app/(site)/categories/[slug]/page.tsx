import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FilterPills } from "@/features/library/filter-bar";
import { ListingPagination } from "@/features/library/listing-pagination";
import { CategoryTile } from "@/features/library/category-tile";
import {
  PageCard,
  pageHref,
  printHref,
} from "@/features/library/page-card";
import { ResultSummary } from "@/features/library/result-summary";
import { parseFilters, type SearchParamsRecord } from "@/lib/url-state";
import { getCatalogRepository } from "@/server/repositories";
import { Artwork } from "@/shared/artwork";
import { Button } from "@/shared/button";
import {
  AGE_RANGE_LABELS,
  DIFFICULTY_LABELS,
} from "@/types/catalog";

export async function generateStaticParams() {
  const categories = await getCatalogRepository().listCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCatalogRepository().getCategory(slug);
  if (!category) return {};
  return {
    title: `${category.name} — category`,
    description: category.description,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

/**
 * Category detail (wireframe 4a): breadcrumb, title, description, a
 * featured page, then the same card grid and pagination as the listing —
 * only the picture strip is replaced by the category header. Related
 * categories close the page.
 */
export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParamsRecord>;
}) {
  const { slug } = await params;
  const repo = getCatalogRepository();
  const category = await repo.getCategory(slug);
  if (!category) notFound();

  const filters = parseFilters(await searchParams);
  const pathname = `/categories/${slug}`;
  const [results, categories] = await Promise.all([
    repo.listPages({ ...filters, category: slug }),
    repo.listCategories(),
  ]);
  const featured = results.page === 1 ? results.pages[0] : undefined;
  const related = categories
    .filter((c) => c.featured && c.slug !== slug)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-[34px] pt-6 md:px-10">
      <nav
        aria-label="Breadcrumb"
        className="text-[14.5px] font-medium text-ink-40"
      >
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-accent">
              Home
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href="/categories" className="hover:text-accent">
              Categories
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-ink">
            {category.name}
          </li>
        </ol>
      </nav>

      <h1 className="text-page-title mt-1.5 text-[30px]/[1.1] text-ink md:text-[38px]/[1.1]">
        {category.name}
      </h1>
      <p className="text-body mt-1.5 text-ink-60">
        {category.pageCount} free {category.name.toLowerCase()} coloring pages.{" "}
        {category.description}
      </p>

      {featured ? (
        <div className="mt-4 flex max-w-xl items-center gap-4 rounded-card border border-line bg-card p-3 shadow-card">
          <Artwork
            src={featured.thumbnailUrl}
            alt=""
            label={`page — ${featured.title.toLowerCase()}`}
            className="size-20 flex-none rounded-thumb border border-thumb-line"
          />
          <div className="flex-1">
            <p className="text-eyebrow text-ink-40">Featured</p>
            <h2 className="mt-0.5 text-[17px] font-semibold text-ink">
              {featured.title}
            </h2>
            <p className="text-meta text-ink-40">
              {DIFFICULTY_LABELS[featured.difficulty]} ·{" "}
              {AGE_RANGE_LABELS[featured.ageRange]}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={pageHref(featured)}>View</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={printHref(featured)}>Print</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
        <FilterPills filters={filters} />
      </div>

      <ResultSummary
        filters={filters}
        total={results.total}
        pathname={pathname}
      />

      <div className="mt-[22px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {results.pages.map((page) => (
          <PageCard
            key={page.slug}
            page={page}
            actions="view-print"
            thumbHeight={190}
          />
        ))}
      </div>

      <ListingPagination
        results={results}
        filters={filters}
        pathname={pathname}
      />

      {related.length > 0 ? (
        <section aria-labelledby="related-categories" className="mt-8">
          <h2
            id="related-categories"
            className="text-subsection text-ink"
          >
            Related categories
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3 md:max-w-xl">
            {related.map((c) => (
              <CategoryTile key={c.slug} category={c} variant="strip" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
