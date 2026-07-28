import Link from "next/link";

import { filtersHref, withFilter } from "@/lib/url-state";
import type { PageFilters } from "@/types/catalog";

import { FILTER_DEFINITIONS, selectedLabel } from "./filter-options";

/**
 * Result summary (hi-fi 6a): "24 pages match", the removable 36px
 * accent-tint chips (each ✕ removes one filter — the sanctioned second use
 * of teal as fill, doubled with the ✕ affordance), and a quiet "Clear
 * filters". The count is a polite live region; it is hidden in Calm Mode.
 */
export function ResultSummary({
  filters,
  total,
  pathname,
  categoryChip,
}: {
  filters: PageFilters;
  total: number;
  pathname: string;
  categoryChip?: { label: string; removeHref: string };
}) {
  const chips = FILTER_DEFINITIONS.flatMap((definition) => {
    const label = selectedLabel(definition, filters);
    return label
      ? [
          {
            key: definition.key,
            label,
            href: withFilter(pathname, filters, {
              [definition.key]: undefined,
            }),
          },
        ]
      : [];
  });

  const hasChips = chips.length > 0 || !!categoryChip || !!filters.q;

  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-3.5">
      <p aria-live="polite" className="text-[16.5px] text-ink-60 calm:hidden">
        <b className="font-bold text-ink">
          {total} {total === 1 ? "page" : "pages"}
        </b>{" "}
        {total === 1 ? "matches" : "match"}
      </p>

      {hasChips ? (
        <>
          <ul className="flex flex-wrap gap-2">
            {categoryChip ? (
              <li>
                <Link
                  href={categoryChip.removeHref}
                  className="flex h-9 items-center gap-[7px] rounded-full border border-accent-tint-line bg-accent-tint px-[13px] text-sm font-medium text-accent"
                >
                  {categoryChip.label}
                  <span aria-hidden>✕</span>
                  <span className="sr-only">— remove filter</span>
                </Link>
              </li>
            ) : null}
            {filters.q ? (
              <li>
                <Link
                  href={withFilter(pathname, filters, { q: undefined })}
                  className="flex h-9 items-center gap-[7px] rounded-full border border-accent-tint-line bg-accent-tint px-[13px] text-sm font-medium text-accent"
                >
                  “{filters.q}”<span aria-hidden>✕</span>
                  <span className="sr-only">— remove search</span>
                </Link>
              </li>
            ) : null}
            {chips.map((chip) => (
              <li key={chip.key}>
                <Link
                  href={chip.href}
                  className="flex h-9 items-center gap-[7px] rounded-full border border-accent-tint-line bg-accent-tint px-[13px] text-sm font-medium text-accent"
                >
                  {chip.label}
                  <span aria-hidden>✕</span>
                  <span className="sr-only">— remove filter</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={filtersHref(pathname, {})}
            className="flex min-h-11 items-center text-[15px] font-semibold text-accent underline underline-offset-[3px] hover:text-accent-hover"
          >
            Clear filters
          </Link>
        </>
      ) : null}
    </div>
  );
}
