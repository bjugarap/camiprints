import Link from "next/link";

import { cn } from "@/lib/utils";
import { Artwork } from "@/shared/artwork";
import { Button } from "@/shared/button";
import {
  AGE_RANGE_LABELS,
  DIFFICULTY_LABELS,
  type ColoringPage,
} from "@/types/catalog";

/**
 * Coloring-page card (handoff §Card). Print is the only filled button that
 * ever appears on a card — that consistency is the whole point of the
 * pattern. Home and related rows show one full-width Print; the listing
 * grid shows View (secondary) + Print side by side.
 */
export function pageHref(page: ColoringPage): string {
  return `/coloring-pages/${page.categorySlug}/${page.slug}`;
}

export function printHref(page: ColoringPage): string {
  return `${pageHref(page)}/print`;
}

export interface PageCardProps {
  page: ColoringPage;
  /** "print" = one full-width Print; "view-print" = View + Print. */
  actions?: "print" | "view-print";
  /** Thumbnail height: 130 related rows · 170 home rows · 190 listing. */
  thumbHeight?: 130 | 150 | 170 | 190;
  /** Hide the metadata line (related rows show title only). */
  showMeta?: boolean;
  className?: string;
}

export function PageCard({
  page,
  actions = "print",
  thumbHeight = 170,
  showMeta = true,
  className,
}: PageCardProps) {
  const meta = `${DIFFICULTY_LABELS[page.difficulty]} · ${AGE_RANGE_LABELS[page.ageRange]}`;

  return (
    <article
      className={cn(
        "rounded-card border border-line bg-card p-3 shadow-card",
        className,
      )}
    >
      <Link
        href={pageHref(page)}
        aria-label={`${page.title} — view page`}
        className="block rounded-thumb"
      >
        <Artwork
          src={page.thumbnailUrl}
          alt=""
          label={`page — ${page.title.toLowerCase()}`}
          className="w-full rounded-thumb border border-thumb-line"
          style={{ height: thumbHeight }}
        />
      </Link>
      <h3 className="mt-2.5 text-[17px] font-semibold text-ink">{page.title}</h3>
      {showMeta ? <p className="text-meta text-ink-40">{meta}</p> : null}
      <div className="mt-2.5 flex gap-2">
        {actions === "view-print" ? (
          <Button asChild variant="secondary" size="md" className="flex-1 px-0">
            <Link href={pageHref(page)}>View</Link>
          </Button>
        ) : null}
        {/* Related 5-up rows (130px thumbs) use the 44px card Print; all
            other card contexts use 48px. */}
        <Button
          asChild
          size={thumbHeight === 130 ? "sm" : "md"}
          className="flex-1 px-0"
        >
          <Link href={printHref(page)}>Print</Link>
        </Button>
      </div>
    </article>
  );
}
