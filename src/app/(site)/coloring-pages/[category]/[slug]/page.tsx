import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtworkFrame } from "@/features/library/artwork-frame";
import { FavouriteButton } from "@/features/library/favourite-button";
import { PageCard, pageHref, printHref } from "@/features/library/page-card";
import { getCatalogRepository } from "@/server/repositories";
import { Button } from "@/shared/button";
import {
  AGE_RANGE_LABELS,
  DETAIL_LEVEL_LABELS,
  DIFFICULTY_LABELS,
  ORIENTATION_LABELS,
  PAPER_LABEL,
} from "@/types/catalog";

export async function generateStaticParams() {
  const { pages } = await getCatalogRepository().listPages({ perPage: 1000 });
  return pages.map((page) => ({
    category: page.categorySlug,
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const page = await getCatalogRepository().getPage(category, slug);
  if (!page) return {};
  return {
    title: `${page.title} — free coloring page`,
    description: page.description,
    alternates: { canonical: pageHref(page) },
  };
}

/** Secondary download action; greys out until the real asset exists. */
function DownloadAction({
  url,
  label,
  size,
}: {
  url: string | null;
  label: string;
  size: "md" | "lg";
}) {
  if (url) {
    return (
      <Button asChild variant="secondary" size={size} className="flex-1 px-0">
        <a href={url} download>
          {label}
        </a>
      </Button>
    );
  }
  return (
    <Button variant="secondary" size={size} className="flex-1 px-0" disabled>
      {label}
      <span className="sr-only"> — not available yet</span>
    </Button>
  );
}

/**
 * Page detail (hi-fi 6b): artwork on a paper sheet left, actions right.
 * The 64px Print is the only filled button above the fold. Metadata is a
 * definition list, not chips, so a screen reader reads it as pairs.
 * Mobile (hi-fi 6c): single column and a sticky bottom print bar — the only
 * sticky element on the site.
 */
export default async function PageDetail({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;
  const repo = getCatalogRepository();
  const [page, category] = await Promise.all([
    repo.getPage(categorySlug, slug),
    repo.getCategory(categorySlug),
  ]);
  if (!page || !category) notFound();

  const related = await repo.getRelatedPages(page, 5);
  const pageKey = `${page.categorySlug}/${page.slug}`;

  const metadata: [string, string][] = [
    ["Category", category.name],
    ["Difficulty", DIFFICULTY_LABELS[page.difficulty]],
    ["Age range", AGE_RANGE_LABELS[page.ageRange]],
    ["Detail level", DETAIL_LEVEL_LABELS[page.detailLevel]],
    ["Orientation", ORIENTATION_LABELS[page.orientation]],
    ["Paper", PAPER_LABEL],
  ];

  return (
    <div className="mx-auto max-w-[1080px] px-4 pt-[22px] md:px-9">
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
            <Link href="/coloring-pages" className="hover:text-accent">
              Coloring pages
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link
              href={`/coloring-pages/${category.slug}`}
              className="hover:text-accent"
            >
              {category.name}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-ink">
            {page.title}
          </li>
        </ol>
      </nav>

      <div className="mt-[18px] flex flex-col items-start gap-6 pb-[30px] md:flex-row md:gap-[34px]">
        {/* The paper frame. Landscape rotates only the sheet — the action
            column never moves. */}
        <div className="w-full flex-none md:w-[420px]">
          <ArtworkFrame page={page} printUrl={printHref(page)} />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-ink font-display text-[27px]/[1.1] font-bold [text-wrap:pretty] md:text-[40px]/[1.1]">
            {page.title}
          </h1>
          <p className="mt-2.5 max-w-[44ch] text-lg/[1.55] text-ink-60 [text-wrap:pretty]">
            {page.description}
          </p>

          {/* Actions — on mobile these live in the sticky bar instead. */}
          <div className="hidden md:block" data-no-print>
            <Button asChild size="print" className="mt-[22px] w-full">
              <Link href={printHref(page)}>Print this page</Link>
            </Button>
            <div className="mt-2.5 flex gap-2.5">
              <DownloadAction url={page.pngUrl} label="Download PNG" size="lg" />
              <DownloadAction url={page.pdfUrl} label="Download PDF" size="lg" />
              <FavouriteButton pageKey={pageKey} size="lg" />
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-[11px] rounded-card border border-line bg-card p-[18px_20px] text-base text-ink">
            {metadata.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="text-ink-40">{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related-pages" className="pb-[30px]">
          <h2 id="related-pages" className="text-subsection text-ink">
            More {category.name.toLowerCase()} pages
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
            {related.map((relatedPage) => (
              <PageCard
                key={relatedPage.slug}
                page={relatedPage}
                thumbHeight={130}
                showMeta={false}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Sticky mobile print bar (hi-fi 6c) — the only sticky element on
          the site. */}
      <div
        data-no-print
        className="sticky bottom-0 -mx-4 border-t border-line bg-card px-4 py-3 shadow-bar md:hidden"
      >
        <Button asChild size="xl" className="w-full">
          <Link href={printHref(page)}>Print this page</Link>
        </Button>
        <div className="mt-2 flex gap-2">
          <DownloadAction url={page.pngUrl} label="PNG" size="md" />
          <DownloadAction url={page.pdfUrl} label="PDF" size="md" />
          <FavouriteButton pageKey={pageKey} size="md" />
        </div>
      </div>
    </div>
  );
}
