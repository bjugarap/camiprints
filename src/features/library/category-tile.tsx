import Link from "next/link";

import { cn } from "@/lib/utils";
import { Artwork, categoryTintClass } from "@/shared/artwork";
import type { CategoryWithCount } from "@/server/repositories/catalog-repository";

/**
 * Category tile (handoff §Category tile). Pictures navigate: the whole tile
 * is one link. Selected state doubles colour with a trailing ✓ so meaning
 * never rides on colour alone. Home tiles are image-dominant — a pre-reader
 * recognises the picture; the name below is for the adult reading along.
 */
export interface CategoryTileProps {
  category: CategoryWithCount;
  /**
   * home: image-dominant, 150–180px tint, centred title 19, no count
   * strip: 64px tint, label 15 (listing picture strip, hi-fi 6a)
   * calm: 120px tint, title 19 (hi-fi 5e)
   */
  variant?: "home" | "strip" | "calm";
  selected?: boolean;
  href?: string;
  className?: string;
}

export function CategoryTile({
  category,
  variant = "home",
  selected = false,
  href,
  className,
}: CategoryTileProps) {
  const tint = category.tint
    ? (categoryTintClass[category.tint] ?? "bg-line/40")
    : "bg-line/40";
  const isStrip = variant === "strip";

  return (
    <Link
      href={href ?? `/coloring-pages/${category.slug}`}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "block bg-card text-center",
        isStrip ? "rounded-xl p-[9px]" : "rounded-card p-3 shadow-card",
        selected
          ? "border-2 border-accent bg-accent-tint p-[8px]"
          : "border border-line",
        !isStrip && selected && "p-[11px]",
        className,
      )}
    >
      <Artwork
        src={category.thumbnailUrl}
        alt=""
        label={category.tint ?? category.slug}
        placeholder={selected ? "bg-card" : tint}
        sizes={
          isStrip ? "160px" : "(min-width: 1280px) 244px, (min-width: 768px) 33vw, 50vw"
        }
        className={cn(
          isStrip ? "h-16 rounded-lg" : "rounded-thumb",
          // Home tiles shrink to the 120px Calm Mode treatment via CSS so
          // the calm layout never depends on client-side branching.
          variant === "home" && "h-[150px] xl:h-[180px] calm:h-[120px]",
          variant === "calm" && "h-[120px]",
        )}
      />
      <div
        className={cn(
          "font-semibold",
          isStrip ? "mt-[7px] text-[15px]" : "mt-2.5 text-[19px]",
          selected ? "text-accent" : "text-ink",
        )}
      >
        {category.name}
        {selected ? " ✓" : ""}
      </div>
    </Link>
  );
}

/** The dashed "All categories" tile that ends the listing picture strip. */
export function AllCategoriesTile({ className }: { className?: string }) {
  return (
    <Link
      href="/categories"
      className={cn(
        "flex items-center justify-center rounded-xl border-[1.5px] border-dashed border-line-strong bg-card p-[9px] text-center text-[14.5px]/[1.3] font-semibold text-ink-60",
        className,
      )}
    >
      All
      <br />
      categories
    </Link>
  );
}
