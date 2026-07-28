import Link from "next/link";

import { cn } from "@/lib/utils";
import { withFilter } from "@/lib/url-state";
import type { PageFilters, PageResults } from "@/types/catalog";

/**
 * Pagination (hi-fi 6a): centred 48px prev/next secondary buttons and 48px
 * round page numbers; the current page is accent-filled.
 */
export function ListingPagination({
  results,
  filters,
  pathname,
}: {
  results: PageResults;
  filters: PageFilters;
  pathname: string;
}) {
  if (results.totalPages <= 1) return null;

  const pages = Array.from({ length: results.totalPages }, (_, i) => i + 1);
  const edge =
    "flex h-12 items-center rounded-full border-[1.5px] border-ink bg-card px-5 text-[15.5px] font-semibold text-ink hover:bg-paper";
  const disabled =
    "flex h-12 items-center rounded-full bg-disabled px-5 text-[15.5px] font-semibold text-white";

  return (
    <nav
      aria-label="Pages of results"
      className="mb-[34px] mt-[26px] flex flex-wrap items-center justify-center gap-2.5"
    >
      {results.page > 1 ? (
        <Link
          href={withFilter(pathname, filters, { page: results.page - 1 })}
          className={edge}
        >
          ← Previous
        </Link>
      ) : (
        <span aria-disabled className={disabled}>
          ← Previous
        </span>
      )}
      {pages.map((page) => (
        <Link
          key={page}
          href={withFilter(pathname, filters, { page })}
          aria-current={page === results.page ? "page" : undefined}
          className={cn(
            "flex size-12 items-center justify-center rounded-full text-base font-semibold",
            page === results.page
              ? "bg-accent text-white"
              : "border-[1.5px] border-line bg-card text-ink hover:border-line-strong",
          )}
        >
          {page}
        </Link>
      ))}
      {results.page < results.totalPages ? (
        <Link
          href={withFilter(pathname, filters, { page: results.page + 1 })}
          className={edge}
        >
          Next →
        </Link>
      ) : (
        <span aria-disabled className={disabled}>
          Next →
        </span>
      )}
    </nav>
  );
}
